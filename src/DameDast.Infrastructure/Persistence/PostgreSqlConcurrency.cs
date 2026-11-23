using Npgsql;

namespace DameDast.Infrastructure.Persistence;

internal static class PostgreSqlConcurrency
{
    // Retry the entire transaction with a fresh context after a competing writer.
    public static bool CanRetry(Exception? exception) => exception is PostgresException
    {
        SqlState: PostgresErrorCodes.UniqueViolation or PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected
    };
}
