using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Domain;
using DameDast.Infrastructure;
using DameDast.Infrastructure.Persistence.Repositories;
using DameDast.Infrastructure.Services.Market;
using DameDast.Infrastructure.Services.Benchmarks;
using Xunit;

namespace DameDast.Tests;

public sealed class FinanceTests
{
    private static Mutation Upsert(string kind, object data, Guid? id = null, long version = 0) => new(Guid.NewGuid(), id ?? Guid.NewGuid(), kind, version, false, JsonSerializer.SerializeToElement(data, FinanceRules.Json));
    private static Mutation Account(string name = "account") => Upsert("account", new Wallet(name, 10000, "teal"));
    private static FinanceDb CreateDb(string path) => new(new DbContextOptionsBuilder<FinanceDb>().UseSqlite($"Data Source={path}").Options);
    [Fact]
    public void TransferRequiresDifferentExistingAccounts()
    {
        var create = Account();
        var record = FinanceRules.Apply([], create);
        var change = Upsert("transaction", new Movement(record.Id, record.Id, "transfer", 50, "Other", new DateOnly(2026, 11, 15), ""));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([record], change));
        change = change with
        {
            Data = JsonSerializer.SerializeToElement(new Movement(record.Id, Guid.NewGuid(), "transfer", 50, "Other", new DateOnly(2026, 11, 15), ""), FinanceRules.Json)
        };
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([record], change));
    }

    [Fact]
    public void MoneyMustBePositiveWholeTomans()
    {
        var create = Account();
        var account = FinanceRules.Apply([], create);
        foreach (var amount in new[]
        {
            -1m,
            0m,
            1.5m,
            1_000_000_000_001m
        }

        )
            Assert.Throws<FinanceException>(() => FinanceRules.Apply([account], Upsert("transaction", new Movement(account.Id, null, "expense", amount, "Food & drinks", new DateOnly(2026, 11, 15), ""))));
    }

    [Fact]
    public void AccountWithTransactionsCannotBeDeleted()
    {
        var account = FinanceRules.Apply([], Account());
        var tx = FinanceRules.Apply([account], Upsert("transaction", new Movement(account.Id, null, "expense", 100, "Food & drinks", new DateOnly(2026, 11, 15), "")));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([account, tx], new Mutation(Guid.NewGuid(), account.Id, "account", 1, true, default)));
    }

    [Fact]
    public async Task RetriedOperationIsAppliedOnceAndUsersAreIsolated()
    {
        var path = Path.GetTempFileName();
        try
        {
            var factory = new TestFactory(path);
            await using (var db = CreateDb(path))
                await db.Database.MigrateAsync();
            var store = new FinanceRepository(factory, TimeProvider.System);
            var change = Account();
            var first = await store.ApplyAsync("alice", [change], CancellationToken.None);
            var second = await store.ApplyAsync("alice", [change], CancellationToken.None);
            Assert.Equal(first.Revision, second.Revision);
            Assert.Single(second.Records);
            Assert.Empty((await store.ReadAsync("bob", CancellationToken.None)).Records);
            await Assert.ThrowsAsync<FinanceException>(() => store.ApplyAsync("alice", [change with { Data = JsonSerializer.SerializeToElement(new Wallet("different", 10, "blue"), FinanceRules.Json) }], CancellationToken.None));
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task StaleVersionIsRejectedAndBatchIsAtomic()
    {
        var path = Path.GetTempFileName();
        try
        {
            var factory = new TestFactory(path);
            await using (var db = CreateDb(path))
                await db.Database.MigrateAsync();
            var store = new FinanceRepository(factory, TimeProvider.System);
            var original = Account();
            await store.ApplyAsync("alice", [original], CancellationToken.None);
            var edit = Upsert("account", new Wallet("new", 20000, "blue"), original.Id, 1);
            await store.ApplyAsync("alice", [edit], CancellationToken.None);
            await Assert.ThrowsAsync<ConflictException>(() => store.ApplyAsync("alice", [Account("must rollback"), edit with { OperationId = Guid.NewGuid() }], CancellationToken.None));
            var state = await store.ReadAsync("alice", CancellationToken.None);
            Assert.Single(state.Records);
            Assert.Equal(2, state.Records[0].Version);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task ConcurrentWritersCannotSilentlyOverwriteSameRecord()
    {
        var path = Path.GetTempFileName();
        try
        {
            var factory = new TestFactory(path);
            await using (var db = CreateDb(path))
                await db.Database.MigrateAsync();
            var store = new FinanceRepository(factory, TimeProvider.System);
            var original = Account();
            await store.ApplyAsync("alice", [original], CancellationToken.None);
            async Task<bool> Edit(string name)
            {
                try
                {
                    await store.ApplyAsync("alice", [Upsert("account", new Wallet(name, 10, "teal"), original.Id, 1)], CancellationToken.None);
                    return true;
                }
                catch (ConflictException)
                {
                    return false;
                }
            }

            var results = await Task.WhenAll(Task.Run(() => Edit("device1")), Task.Run(() => Edit("device2")));
            Assert.Single(results, x => x);
            Assert.Equal(2, (await store.ReadAsync("alice", CancellationToken.None)).Records[0].Version);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task ApiRequiresAuthenticationAndCsrfAndReturnsConflict()
    {
        await using var app = new TestApp();
        using var client = app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/finance", CancellationToken.None)).StatusCode);
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        var change = Account();
        var request = new SyncRequest([change]);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/sync", request, CancellationToken.None)).StatusCode);
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session", CancellationToken.None);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
        var result = await client.PostAsJsonAsync("/api/sync", request, CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, result.StatusCode);
        result = await client.PostAsJsonAsync("/api/sync", new SyncRequest([change with { OperationId = Guid.NewGuid() }]), CancellationToken.None);
        Assert.Equal(HttpStatusCode.Conflict, result.StatusCode);
        client.DefaultRequestHeaders.Remove("X-Test-User");
        client.DefaultRequestHeaders.Add("X-Test-User", "bob");
        var data = await client.GetFromJsonAsync<Snapshot>("/api/finance", CancellationToken.None);
        Assert.Empty(data!.Records);
    }

    private sealed class TestFactory(string path) : IDbContextFactory<FinanceDb>
    {
        public FinanceDb CreateDbContext() => CreateDb(path);
    }

    internal sealed class TestApp(Action<IServiceCollection>? configure = null) : WebApplicationFactory<Program>
    {
        private readonly string path = Path.GetTempFileName();
        private readonly string dataDirectory = Path.Combine(Path.GetTempPath(), "damdast-tests-" + Guid.NewGuid().ToString("N"));
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> { { "ConnectionStrings:Finance", $"Data Source={path}" }, { "Storage:DataDirectory", dataDirectory } }));
            builder.ConfigureServices(services =>
            {
                var keys = new DirectoryInfo(Path.Combine(dataDirectory, "keys"));
                keys.Create();
                services.AddDataProtection().PersistKeysToFileSystem(keys).SetApplicationName("DameDast");
                services.AddAuthentication(o =>
                {
                    o.DefaultAuthenticateScheme = "Test";
                    o.DefaultChallengeScheme = "Test";
                }).AddScheme<AuthenticationSchemeOptions, TestAuth>("Test", _ =>
                {
                });
                configure?.Invoke(services);
            });
        }

        public override async ValueTask DisposeAsync()
        {
            await base.DisposeAsync();
            File.Delete(path);
            if (Directory.Exists(dataDirectory))
                Directory.Delete(dataDirectory, true);
        }
    }

    private sealed class TestAuth(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var id = Request.Headers["X-Test-User"].ToString();
            if (string.IsNullOrEmpty(id))
                return Task.FromResult(AuthenticateResult.NoResult());
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id), new Claim(ClaimTypes.Name, id)], "Test")), "Test")));
        }
    }
}
