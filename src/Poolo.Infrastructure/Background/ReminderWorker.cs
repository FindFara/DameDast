using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Poolo.Application.Interfaces.Reminders;
using Poolo.Application.Services;

namespace Poolo.Infrastructure.Background;

public sealed class ReminderWorker(IServiceScopeFactory scopes, TimeProvider clock, ILogger<ReminderWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<IReminderService>().SendDueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Installment reminder pass failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), clock, stoppingToken);
        }
    }
}
