using System.Threading.Channels;
using DameDast.Application.Interfaces.Administration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DameDast.Infrastructure.Background;

// Bounded, best-effort telemetry. No request awaits database storage; no financial DbContext is shared.
public sealed class PageViewWorker(IPageViewRepository repository, TimeProvider time, ILogger<PageViewWorker> logger) : BackgroundService, IPageViewRecorder
{
    private readonly Channel<(string Page, DateOnly Date)> queue = Channel.CreateBounded<(string, DateOnly)>(new BoundedChannelOptions(4096) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true });
    public void Record(string page)
    {
        if (!queue.Writer.TryWrite((page, DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime))))
            logger.LogWarning("Page-view queue full; discarded a view");
    }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (await queue.Reader.WaitToReadAsync(stoppingToken))
            {
                var batch = new Dictionary<(string Page, DateOnly Date), long>();
                for (var i = 0; i < 256 && queue.Reader.TryRead(out var view); i++) batch[view] = batch.GetValueOrDefault(view) + 1;
                foreach (var (view, count) in batch)
                {
                    try
                    {
                        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                        timeout.CancelAfter(TimeSpan.FromSeconds(3));
                        await repository.IncrementAsync(view.Page, view.Date, count, timeout.Token);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
                    catch (Exception exception)
                    {
                        logger.LogWarning("Page-view storage failed with {ExceptionType}; discarded {Count} views", exception.GetType().Name, count);
                    }
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
    public override Task StopAsync(CancellationToken cancellationToken)
    {
        queue.Writer.TryComplete();
        return base.StopAsync(cancellationToken);
    }
}
