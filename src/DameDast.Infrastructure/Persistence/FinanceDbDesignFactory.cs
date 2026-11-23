using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace DameDast.Infrastructure.Persistence;

public sealed class FinanceDbDesignFactory : IDesignTimeDbContextFactory<FinanceDb>
{
    public FinanceDb CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<FinanceDb>()
        .UseNpgsql(Environment.GetEnvironmentVariable("ConnectionStrings__Finance")
            ?? "Host=localhost;Database=damedast;Username=damedast").Options);
}
