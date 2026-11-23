using Microsoft.EntityFrameworkCore;

namespace DameDast.Infrastructure;

public sealed class FinanceDb(DbContextOptions<FinanceDb> options) : DbContext(options)
{
    public DbSet<LedgerRow> Ledgers => Set<LedgerRow>();
    public DbSet<FinanceRecordRow> FinanceRecords => Set<FinanceRecordRow>();
    public DbSet<Receipt> Receipts => Set<Receipt>();
    public DbSet<DeviceSubscription> Subscriptions => Set<DeviceSubscription>();
    public DbSet<ReminderReceipt> ReminderReceipts => Set<ReminderReceipt>();
    public DbSet<MarketSample> MarketSamples => Set<MarketSample>();

    public DbSet<WhiteboardRow> Whiteboards => Set<WhiteboardRow>();
    public DbSet<WhiteboardOperation> WhiteboardOperations => Set<WhiteboardOperation>();
    public DbSet<WhiteboardShare> WhiteboardShares => Set<WhiteboardShare>();
    public DbSet<WhiteboardLibrary> WhiteboardLibraries => Set<WhiteboardLibrary>();

    protected override void OnModelCreating(ModelBuilder model) =>
        model.ApplyConfigurationsFromAssembly(typeof(FinanceDb).Assembly);
}
