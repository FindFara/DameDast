using Microsoft.EntityFrameworkCore;

namespace DameDast.Infrastructure.Persistence;

internal static class DatabaseWriteRetry
{
    private const int MaxRetries = 4;

    public static async Task<T> ExecuteAsync<T>(Func<Task<T>> write, CancellationToken cancellationToken)
    {
        for (var attempt = 0; ; attempt++)
        {
            try { return await write(); }
            catch (Exception exception) when (attempt < MaxRetries && CanRetry(exception))
            {
                await Task.Delay(TimeSpan.FromMilliseconds(40 * (attempt + 1)), cancellationToken);
            }
        }
    }

    private static bool CanRetry(Exception exception) => exception is DbUpdateConcurrencyException ||
        PostgreSqlConcurrency.CanRetry(exception) ||
        exception is DbUpdateException update && PostgreSqlConcurrency.CanRetry(update.InnerException);
}
