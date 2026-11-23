using Microsoft.EntityFrameworkCore;
using DameDast.Infrastructure.Persistence;
using DameDast.Application.Interfaces.Whiteboards;
using DameDast.Application.Interfaces.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Market;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Interfaces.Benchmarks;
using DameDast.Infrastructure.Background;
using DameDast.Infrastructure.Persistence.Repositories;
using DameDast.Infrastructure.Services.Benchmarks;
using DameDast.Infrastructure.Services.Market;
using DameDast.Infrastructure.Services.Push;

namespace DameDast.Infrastructure;

public static class DependencyInjection
{
    private const string MarketClient = "market";
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        Directory.CreateDirectory(Path.Combine(configuration["Storage:DataDirectory"] ?? "data", "keys"));
        services.TryAddSingleton(TimeProvider.System);
        services.AddDbContextFactory<FinanceDb>(options =>
            options.UseNpgsql(PostgreSqlConfiguration.ReadConnectionString(configuration)));
        services.AddScoped<IFinanceRepository, FinanceRepository>();
        services.AddScoped<IDatabaseHealth, PostgreSqlHealth>();
        services.AddScoped<IWhiteboardRepository, WhiteboardRepository>();
        services.AddSingleton<IMarketSampleRepository, MarketSampleRepository>();
        services.AddScoped<IPushSubscriptionRepository, PushSubscriptionRepository>();
        services.AddScoped<IReminderReceiptRepository, ReminderReceiptRepository>();
        services.AddSingleton<IPushGateway, WebPushGateway>();
        services.AddHttpClient(MarketClient, client =>
        {
            client.Timeout = TimeSpan.FromSeconds(20);
            client.MaxResponseContentBufferSize = 6_000_000;
            client.DefaultRequestHeaders.UserAgent.ParseAdd("DameDast/1.0");
        });
        services.AddSingleton<IMarketService>(provider => new MarketService(provider.GetRequiredService<IHttpClientFactory>().CreateClient(MarketClient), provider.GetRequiredService<IMarketSampleRepository>(), provider.GetRequiredService<TimeProvider>()));
        services.AddSingleton<IBenchmarkService>(provider => new BenchmarkService(provider.GetRequiredService<IHttpClientFactory>().CreateClient(MarketClient), provider.GetRequiredService<TimeProvider>()));
        services.AddHostedService<ReminderWorker>();
        return services;
    }

    public static async Task InitializeInfrastructureAsync(this IServiceProvider services, CancellationToken cancellationToken)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FinanceDb>();
        await db.Database.MigrateAsync(cancellationToken);
        await services.GetRequiredService<IPushGateway>().InitializeAsync(cancellationToken);
    }
}
