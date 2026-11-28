using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DameDast.Application;
using DameDast.Application.Behaviors;
using DameDast.Application.Features.Administration;
using DameDast.Application.Interfaces.Administration;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Domain;
using DameDast.Infrastructure;
using DameDast.Infrastructure.Background;
using DameDast.Infrastructure.Persistence.Repositories;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DameDast.Tests;

public sealed class AdministrationTests
{
    [Fact]
    public async Task MigrationBackfillsExistingOwnersWithoutChangingTheirData()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using var db = database.CreateDbContext();
        await db.GetService<IMigrator>().MigrateAsync("20261127000100_PushNotificationPreferences");
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO "Ledgers" ("UserId", "Revision", "UpdatedAt") VALUES ('legacy-ledger', 7, CURRENT_TIMESTAMP);
            INSERT INTO "WhiteboardLibraries" ("UserId", "Revision", "Items") VALUES ('legacy-library', 3, '[]');
            """);
        await db.Database.MigrateAsync();
        var users = await db.Users.Include(x => x.Roles).OrderBy(x => x.Id).ToArrayAsync();
        Assert.Equal(new[] { "legacy-ledger", "legacy-library" }, users.Select(x => x.Id));
        Assert.All(users, user => { Assert.True(user.IsActive); Assert.Equal("User", Assert.Single(user.Roles).RoleName); });
        Assert.Equal(7, (await db.Ledgers.SingleAsync()).Revision);
        Assert.Equal(3, (await db.WhiteboardLibraries.SingleAsync()).Revision);
        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Fact]
    public async Task ConcurrentFirstRequestsCreateOneUserAndKeepDisabledAccountsDisabled()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using var db = database.CreateDbContext();
        await db.Database.MigrateAsync();
        var repository = new AdministrationRepository(database, TimeProvider.System);
        await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => repository.EnsureUserAsync(new("google-subject", "Person", "person@example.test"), default)));
        var user = await db.Users.Include(x => x.Roles).SingleAsync();
        Assert.Single(user.Roles); Assert.Equal("person@example.test", user.Email);
        user.IsActive = false; await db.SaveChangesAsync();
        Assert.False((await repository.EnsureUserAsync(new(user.Id, "Changed", null), default)).IsActive);
        Assert.Equal(user.Id, (await db.Users.SingleAsync()).Id);
    }

    [Fact]
    public async Task AdminAreaAndApiRejectGuestsAndOrdinaryUsersAndRequireCsrf()
    {
        await using var app = new FinanceTests.TestApp();
        using var client = app.CreateClient(new() { AllowAutoRedirect = false });
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/admin")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/admin/api/users")).StatusCode);
        client.DefaultRequestHeaders.Add("X-Test-User", "ordinary");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/admin")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/admin/api/roles")).StatusCode);
        using var admin = await AdminClientAsync(app);
        var dashboard = await admin.GetAsync("/admin");
        Assert.Equal(HttpStatusCode.OK, dashboard.StatusCode);
        Assert.Contains("مدیریت", await dashboard.Content.ReadAsStringAsync());
        Assert.True(dashboard.Headers.CacheControl!.NoStore);
        admin.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/admin/api/roles", new SaveRoleCommand(null, "Editor"))).StatusCode);
        await CsrfAsync(admin);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsJsonAsync("/admin/api/roles", new SaveRoleCommand(null, "Editor"))).StatusCode);
    }

    [Fact]
    public async Task AdminCanManageUsersAndRolesAndRevocationAppliesToExistingSessions()
    {
        await using var app = new FinanceTests.TestApp();
        using var admin = await AdminClientAsync(app);
        var editor = new SaveUser("bob", "Bob", "bob@example.test", true, ["User", "Editor"]);
        await SuccessAsync(admin.PostAsJsonAsync("/admin/api/roles", new SaveRoleCommand(null, "Editor")));
        await SuccessAsync(admin.PostAsJsonAsync("/admin/api/users", editor));
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/admin/api/users", editor)).StatusCode);
        await SuccessAsync(admin.PostAsJsonAsync("/admin/api/roles", new SaveRoleCommand("Editor", "editor")));
        var page = await admin.GetFromJsonAsync<UserPage>("/admin/api/users?search=bob");
        Assert.Contains("editor", Assert.Single(page!.Items).Roles);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.DeleteAsync("/admin/api/roles/editor")).StatusCode);
        await SuccessAsync(admin.PutAsJsonAsync("/admin/api/users", editor with { Roles = ["User", "Admin"] }));
        using var bob = app.CreateClient(); bob.DefaultRequestHeaders.Add("X-Test-User", "bob");
        Assert.Equal(HttpStatusCode.OK, (await bob.GetAsync("/admin/api/users")).StatusCode);
        await SuccessAsync(admin.PutAsJsonAsync("/admin/api/users", editor with { Roles = ["User"] }));
        Assert.Equal(HttpStatusCode.Forbidden, (await bob.GetAsync("/admin/api/users")).StatusCode);
        await SuccessAsync(admin.DeleteAsync("/admin/api/roles/editor"));
        await SuccessAsync(admin.PutAsJsonAsync("/admin/api/users", editor with { Roles = ["User"], IsActive = false }));
        Assert.Equal(HttpStatusCode.Forbidden, (await bob.GetAsync("/api/finance")).StatusCode);
        var self = new SaveUser("root", "Root", null, false, ["User"]);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync("/admin/api/users", self)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.DeleteAsync("/admin/api/roles/Admin")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/admin/api/roles", new SaveRoleCommand("Admin", "Owner"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/admin/api/roles", new SaveRoleCommand(null, "ADMIN"))).StatusCode);
    }

    [Fact]
    public async Task CallingMediatorDirectlyDoesNotBypassAdminAuthorization()
    {
        await using var services = new ServiceCollection().AddApplication().AddSingleton<ICurrentUser>(new OrdinaryUser()).BuildServiceProvider();
        await Assert.ThrowsAsync<AdminForbiddenException>(() => services.GetRequiredService<ISender>().Send(new GetUsersQuery(null)));
    }

    [Fact]
    public async Task PageViewIncrementsAreAtomicAndReportsFillEmptyDaysAndFilterPages()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using var db = database.CreateDbContext(); await db.Database.MigrateAsync();
        var repository = new PageViewRepository(database);
        var day = new DateOnly(2026, 11, 28);
        await Task.WhenAll(Enumerable.Range(0, 12).Select(_ => repository.IncrementAsync("overview", day, 1, default)));
        await repository.IncrementAsync("notes", day, 3, default);
        var report = await repository.ReportAsync(day.AddDays(-1), day, null, default);
        Assert.Equal(15, report.TotalViews); Assert.Equal(2, report.Pages.Count);
        Assert.Equal(0, report.Daily[0].Views); Assert.Equal(15, report.Daily[1].Views);
        Assert.Equal(12, (await repository.ReportAsync(day, day, "overview", default)).TotalViews);
    }

    [Fact]
    public async Task PageViewFailuresDoNotBreakTelemetryResponseOrMainApiAndUnknownPagesAreIgnored()
    {
        var recorder = new FailingRecorder();
        await using var app = new FinanceTests.TestApp(services =>
        {
            services.RemoveAll<IPageViewRecorder>(); services.AddSingleton<IPageViewRecorder>(recorder);
        });
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/analytics/page-view", new { page = "overview" })).StatusCode);
        await CsrfAsync(client);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/analytics/page-view", new { page = "overview" })).StatusCode);
        Assert.Equal(1, recorder.Calls);
        await client.PostAsJsonAsync("/api/analytics/page-view", new { page = "notes/private-document-id" });
        Assert.Equal(1, recorder.Calls);
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/finance")).StatusCode);
    }

    [Fact]
    public async Task BackgroundStorageFailureIsContainedAndLaterViewsStillSave()
    {
        var repository = new IntermittentViews();
        using var worker = new PageViewWorker(repository, TimeProvider.System, NullLogger<PageViewWorker>.Instance);
        await worker.StartAsync(default);
        worker.Record("overview"); await repository.First.Task.WaitAsync(TimeSpan.FromSeconds(5));
        worker.Record("notes"); await repository.Recovered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await worker.StopAsync(default);
        Assert.Equal("notes", repository.Saved);
    }

    [Fact]
    public async Task AnalyticsApiValidatesRangesAndFiltersDailyCounts()
    {
        await using var app = new FinanceTests.TestApp(); using var admin = await AdminClientAsync(app);
        using (var scope = app.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<IPageViewRepository>().IncrementAsync("overview", new(2026, 11, 28), 5, default);
        var report = await admin.GetFromJsonAsync<PageViewReport>("/admin/api/views?from=2026-11-27&to=2026-11-28&page=overview");
        Assert.Equal(5, report!.TotalViews); Assert.Equal(2, report.Daily.Count);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/admin/api/views?from=2026-11-28&to=2026-11-27")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/admin/api/views?from=2020-01-01&to=2026-11-28")).StatusCode);
    }

    [Fact]
    public async Task PipelineLogsSuccessFailureAndCancellationWithoutPrivatePayloads()
    {
        var logger = new CapturingLogger<LoggingBehavior<TrackPageViewCommand, int>>();
        var behavior = new LoggingBehavior<TrackPageViewCommand, int>(logger);
        var request = new TrackPageViewCommand("private-value");
        Assert.Equal(42, await behavior.Handle(request, _ => Task.FromResult(42), default));
        await Assert.ThrowsAsync<FinanceException>(() => behavior.Handle(request, _ => throw new FinanceException("secret-message"), default));
        using var source = new CancellationTokenSource(); source.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => behavior.Handle(request, _ => Task.FromCanceled<int>(source.Token), source.Token));
        Assert.Contains(logger.Messages, x => x.Contains("Handled"));
        Assert.Contains(logger.Messages, x => x.Contains("Failed"));
        Assert.Contains(logger.Messages, x => x.Contains("Cancelled"));
        Assert.DoesNotContain(logger.Messages, x => x.Contains("private-value") || x.Contains("secret-message"));
    }

    private static async Task<HttpClient> AdminClientAsync(FinanceTests.TestApp app)
    {
        var client = app.CreateClient(new() { AllowAutoRedirect = false }); client.DefaultRequestHeaders.Add("X-Test-User", "root");
        await CsrfAsync(client);
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<FinanceDb>();
        db.UserRoles.Add(new() { UserId = "root", RoleName = "Admin" }); await db.SaveChangesAsync();
        await CsrfAsync(client);
        return client;
    }
    private static async Task CsrfAsync(HttpClient client)
    {
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
    }
    private static async Task SuccessAsync(Task<HttpResponseMessage> task)
    {
        using var response = await task;
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }
    private sealed class OrdinaryUser : ICurrentUser
    {
        public bool IsAuthenticated => true; public string? Id => "ordinary"; public string? Name => "Person"; public string? PictureUrl => null; public string RequireId() => Id!;
    }
    private sealed class FailingRecorder : IPageViewRecorder
    {
        public int Calls { get; private set; }
        public void Record(string page) { Calls++; throw new InvalidOperationException("Telemetry unavailable"); }
    }
    private sealed class IntermittentViews : IPageViewRepository
    {
        public TaskCompletionSource First { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Recovered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public string? Saved { get; private set; }
        public Task IncrementAsync(string page, DateOnly date, long count, CancellationToken ct)
        {
            if (page == "overview") { First.TrySetResult(); throw new InvalidOperationException(); }
            Saved = page; Recovered.TrySetResult(); return Task.CompletedTask;
        }
        public Task<PageViewReport> ReportAsync(DateOnly from, DateOnly to, string? page, CancellationToken ct) => throw new NotSupportedException();
    }
    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel level) => true;
        public void Log<TState>(LogLevel level, EventId id, TState state, Exception? exception, Func<TState, Exception?, string> formatter) => Messages.Add(formatter(state, exception));
    }
}
