using Microsoft.Extensions.Configuration;
using Npgsql;

namespace DameDast.Infrastructure.Persistence;

public static class PostgreSqlConfiguration
{
    public static string ReadConnectionString(IConfiguration configuration)
    {
        var configured = configuration.GetConnectionString("Finance");
        try
        {
            if (!string.IsNullOrWhiteSpace(configured))
            {
                var connection = new NpgsqlConnectionStringBuilder(configured);
                if (!string.IsNullOrWhiteSpace(connection.Host) &&
                    !string.IsNullOrWhiteSpace(connection.Database) &&
                    !string.IsNullOrWhiteSpace(connection.Username))
                    return connection.ConnectionString;
            }
        }
        catch (ArgumentException) { }

        throw new InvalidOperationException("Configure ConnectionStrings:Finance (or ConnectionStrings__Finance) with a PostgreSQL connection string containing Host, Database and Username.");
    }
}
