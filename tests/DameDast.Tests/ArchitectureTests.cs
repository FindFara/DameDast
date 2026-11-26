using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using DameDast.Application;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Market;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Features.Benchmarks.Models;
using DameDast.Application.Interfaces.Benchmarks;
using DameDast.Application.Features.FinanceRecords.Commands;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Application.Features.FinanceRecords.Queries;
using DameDast.Application.Features.Market.Models;
using DameDast.Application.Features.Portfolio.Commands;
using DameDast.Application.Features.Reminders.Models;
using DameDast.Application.Services;
using DameDast.Domain;
using DameDast.Infrastructure;
using DameDast.Web.Controllers;
using Xunit;

namespace DameDast.Tests;

public sealed class ArchitectureTests
{
    [Fact]
    public void InnerLayersDoNotReferencePresentationPersistenceOrEf()
    {
        var references = typeof(SyncFinanceCommand).Assembly.GetReferencedAssemblies().Select(x => x.Name).ToArray();
        Assert.DoesNotContain(references, name => name is not null && (name.StartsWith("DameDast.Infrastructure", StringComparison.Ordinal) || name.StartsWith("DameDast.Web", StringComparison.Ordinal) || name.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal) || name.StartsWith("Microsoft.AspNetCore", StringComparison.Ordinal)));
        Assert.DoesNotContain(typeof(FinanceRecord).Assembly.GetReferencedAssemblies(), name => name.Name?.StartsWith("DameDast.Application", StringComparison.Ordinal) == true);
        foreach (var controller in typeof(FinanceController).Assembly.GetTypes().Where(x => x.IsSubclassOf(typeof(ControllerBase))))
            foreach (var dependency in controller.GetConstructors().SelectMany(x => x.GetParameters()))
                Assert.False(dependency.ParameterType.Namespace?.StartsWith("DameDast.Infrastructure", StringComparison.Ordinal));
    }

    [Fact]
    public async Task MediatorUsesTheRepositoryContractAndPropagatesTheCancellationToken()
    {
        var repository = new RecordingFinanceRepository();
        await using var services = ApplicationServices(repository, authenticated: true);
        using var source = new CancellationTokenSource();
        var snapshot = await services.GetRequiredService<ISender>().Send(new GetFinanceQuery(), source.Token);
        Assert.Equal(42, snapshot.Revision);
        Assert.Equal("alice", repository.LastUser);
        Assert.Equal(source.Token, repository.LastToken);
    }

    [Fact]
    public async Task ApplicationAuthorizationCannotBeBypassedByCallingMediatorDirectly()
    {
        var repository = new RecordingFinanceRepository();
        await using var services = ApplicationServices(repository, authenticated: false);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => services.GetRequiredService<ISender>().Send(new GetFinanceQuery(), CancellationToken.None));
        Assert.Equal(0, repository.Calls);
    }

    [Fact]
    public async Task CancelledRequestsDoNotReachTheRepository()
    {
        var repository = new RecordingFinanceRepository();
        await using var services = ApplicationServices(repository, authenticated: true);
        using var source = new CancellationTokenSource();
        await source.CancelAsync();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => services.GetRequiredService<ISender>().Send(new GetFinanceQuery(), source.Token));
        Assert.Equal(0, repository.Calls);
    }

    [Theory]
    [InlineData("empty")]
    [InlineData("too-large")]
    [InlineData("duplicate")]
    [InlineData("null")]
    public async Task ValidationBehaviorRejectsBadBatchesBeforeServicesCanWrite(string scenario)
    {
        var repository = new RecordingFinanceRepository();
        await using var services = ApplicationServices(repository, authenticated: true);
        var change = AccountChange();
        IReadOnlyList<Mutation> changes = scenario switch
        {
            "empty" => [],
            "too-large" => Enumerable.Range(0, 101).Select(_ => AccountChange()).ToArray(),
            "duplicate" => [change, change],
            _ => null!
        };
        var sender = services.GetRequiredService<ISender>();
        await Assert.ThrowsAsync<FinanceException>(() => sender.Send(new SyncFinanceCommand(new SyncRequest(changes)), CancellationToken.None));
        await Assert.ThrowsAsync<FinanceException>(() => sender.Send(new SyncPortfolioCommand(new SyncRequest(changes)), CancellationToken.None));
        Assert.Equal(0, repository.Calls);
    }

    [Fact]
    public async Task FinanceControllerDispatchesThroughTheApplicationPipeline()
    {
        var repository = new RecordingFinanceRepository();
        await using var app = new FinanceTests.TestApp(services =>
        {
            services.RemoveAll<IFinanceRepository>();
            services.AddSingleton<IFinanceRepository>(repository);
        });
        using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session", CancellationToken.None);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
        var response = await client.PostAsJsonAsync("/api/sync", new SyncRequest([AccountChange()]), CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(42, (await response.Content.ReadFromJsonAsync<Snapshot>(CancellationToken.None))!.Revision);
        Assert.Equal("alice", repository.LastUser);
        Assert.Equal(1, repository.Calls);
        Assert.True(repository.LastToken.CanBeCanceled);
    }

    [Fact]
    public async Task PublicMarketControllersResolveApplicationContractsWithoutProviderTraffic()
    {
        var market = new StubMarketService();
        await using var app = new FinanceTests.TestApp(services =>
        {
            services.RemoveAll<IMarketService>();
            services.AddSingleton<IMarketService>(market);
            services.RemoveAll<IBenchmarkService>();
            services.AddSingleton<IBenchmarkService, StubBenchmarkService>();
        });
        using var client = app.CreateClient();
        var quote = await client.GetFromJsonAsync<MarketSnapshot>("/api/market", CancellationToken.None);
        Assert.Equal(100, Assert.Single(quote!.Quotes).Price);
        var history = await client.GetFromJsonAsync<PricePoint[]>("/api/market/history?symbol=GOLD&days=7", CancellationToken.None);
        Assert.Single(history!);
        Assert.Equal(("GOLD", 7), market.HistoryRequest);
        Assert.NotNull(await client.GetFromJsonAsync<BenchmarkSnapshot>("/api/benchmarks", CancellationToken.None));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/market/history?symbol=GOLD", CancellationToken.None)).StatusCode);
    }

    [Fact]
    public async Task PushCommandsKeepCsrfLanguageAndPerUserDeletionThroughTheRepository()
    {
        await using var app = new FinanceTests.TestApp(services =>
        {
            services.RemoveAll<IPushGateway>();
            services.AddSingleton<IPushGateway, StubPushGateway>();
        });
        using var client = app.CreateClient();
        var registration = new PushRegistration("https://fcm.googleapis.com/fcm/send/test", new PushKeys(Convert.ToBase64String(new byte[65]), Convert.ToBase64String(new byte[16])), "fa");
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/push/subscribe", registration, CancellationToken.None)).StatusCode);
        await SetCsrfAsync(client);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/push/subscribe", registration, CancellationToken.None)).StatusCode);
        using (var scope = app.Services.CreateScope())
        {
            var subscriptions = await scope.ServiceProvider.GetRequiredService<FinanceDb>().Subscriptions.AsNoTracking().ToListAsync(CancellationToken.None);
            var saved = Assert.Single(subscriptions);
            Assert.Equal("alice", saved.UserId);
            Assert.Equal("fa", saved.Language);
        }

        client.DefaultRequestHeaders.Remove("X-Test-User");
        client.DefaultRequestHeaders.Add("X-Test-User", "bob");
        await SetCsrfAsync(client);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/push/unsubscribe", new { registration.Endpoint }, CancellationToken.None)).StatusCode);
        using var finalScope = app.Services.CreateScope();
        Assert.Single(await finalScope.ServiceProvider.GetRequiredService<FinanceDb>().Subscriptions.ToListAsync(CancellationToken.None));
    }

    [Fact]
    public async Task PostgreSqlMigrationsMatchTheCurrentModel()
    {
        await using var app = new FinanceTests.TestApp();
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health", CancellationToken.None)).StatusCode);
        using var scope = app.Services.CreateScope();
        Assert.False(scope.ServiceProvider.GetRequiredService<FinanceDb>().Database.HasPendingModelChanges());
    }

    private static async Task SetCsrfAsync(HttpClient client)
    {
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session", CancellationToken.None);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
    }

    private static Mutation AccountChange() => new(Guid.NewGuid(), Guid.NewGuid(), "account", 0, false, JsonSerializer.SerializeToElement(new Wallet("Main", 100, "teal"), FinanceRules.Json));
    private static ServiceProvider ApplicationServices(RecordingFinanceRepository repository, bool authenticated) =>
        new ServiceCollection().AddApplication().AddSingleton<ICurrentUser>(new TestUser(authenticated)).AddSingleton<IFinanceRepository>(repository).BuildServiceProvider();
    private sealed class TestUser(bool authenticated) : ICurrentUser
    {
        public bool IsAuthenticated => authenticated;
        public string? Id => authenticated ? "alice" : null;
        public string? Name => Id;
        public string? PictureUrl => null;

        public string RequireId() => Id ?? throw new UnauthorizedAccessException();
    }

    private sealed class RecordingFinanceRepository : IFinanceRepository
    {
        public int Calls { get; private set; }
        public string? LastUser { get; private set; }
        public CancellationToken LastToken { get; private set; }

        public Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken) => Capture(userId, cancellationToken);
        public Task<Snapshot> ApplyAsync(string userId, IReadOnlyList<Mutation> changes, CancellationToken cancellationToken) =>
            Capture(userId, cancellationToken);
        private Task<Snapshot> Capture(string userId, CancellationToken cancellationToken)
        {
            Calls++;
            LastUser = userId;
            LastToken = cancellationToken;
            return Task.FromResult(new Snapshot(42, []));
        }
    }

    private sealed class StubMarketService : IMarketService
    {
        public (string Symbol, int Days) HistoryRequest { get; private set; }

        public Task<MarketSnapshot> ReadAsync(CancellationToken cancellationToken) => Task.FromResult(new MarketSnapshot([new MarketQuote("GOLD", "Gold", 100, "toman", 0, DateTimeOffset.UnixEpoch, "Test")], false, null, null));
        public Task<IReadOnlyList<PricePoint>> HistoryAsync(string symbol, int days, CancellationToken cancellationToken)
        {
            HistoryRequest = (symbol, days);
            return Task.FromResult<IReadOnlyList<PricePoint>>([new PricePoint(1, 100)]);
        }
    }

    private sealed class StubBenchmarkService : IBenchmarkService
    {
        public Task<BenchmarkSnapshot> ReadAsync(CancellationToken cancellationToken) => Task.FromResult(new BenchmarkSnapshot(new Dictionary<string, BenchmarkCurve>(), DateTimeOffset.UnixEpoch));
    }

    private sealed class StubPushGateway : IPushGateway
    {
        public PushConfiguration Configuration => new(true, "test-public-key");

        public Task InitializeAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<PushDeliveryResult> SendAsync(PushDevice device, PushMessage message, CancellationToken cancellationToken) =>
            Task.FromResult(PushDeliveryResult.Delivered);
    }
}
