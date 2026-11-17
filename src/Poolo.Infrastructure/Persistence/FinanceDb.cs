using Microsoft.EntityFrameworkCore;

namespace Poolo.Infrastructure;

public sealed class FinanceDb(DbContextOptions<FinanceDb> options) : DbContext(options)
{
    public DbSet<LedgerRow> Ledgers => Set<LedgerRow>();
    public DbSet<Receipt> Receipts => Set<Receipt>();
    public DbSet<DeviceSubscription> Subscriptions => Set<DeviceSubscription>();
    public DbSet<ReminderReceipt> ReminderReceipts => Set<ReminderReceipt>();
    public DbSet<MarketSample> MarketSamples => Set<MarketSample>();

    public DbSet<WhiteboardRow> Whiteboards => Set<WhiteboardRow>();
    public DbSet<WhiteboardOperation> WhiteboardOperations => Set<WhiteboardOperation>();
    public DbSet<WhiteboardShare> WhiteboardShares => Set<WhiteboardShare>();
    public DbSet<WhiteboardLibrary> WhiteboardLibraries => Set<WhiteboardLibrary>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<WhiteboardRow>().Property(x => x.Id).ValueGeneratedNever();
        model.Entity<WhiteboardShare>().Property(x => x.Id).ValueGeneratedNever();
        model.Entity<WhiteboardRow>().HasKey(x => x.Id);
        model.Entity<WhiteboardRow>().Property(x => x.Revision).IsConcurrencyToken();
        model.Entity<WhiteboardOperation>().HasKey(x => new { x.DocumentId, x.OperationId });
        model.Entity<WhiteboardShare>().HasKey(x => x.Id);
        model.Entity<WhiteboardShare>().HasIndex(x => x.TokenHash).IsUnique();
        model.Entity<WhiteboardLibrary>().HasKey(x => x.UserId);
        model.Entity<WhiteboardLibrary>().Property(x => x.Revision).IsConcurrencyToken();
        model.Entity<LedgerRow>().HasKey(x => x.UserId);
        model.Entity<LedgerRow>().Property(x => x.Revision).IsConcurrencyToken();
        model.Entity<Receipt>().HasKey(x => new { x.UserId, x.OperationId });
        model.Entity<DeviceSubscription>().HasKey(x => x.Id);
        model.Entity<ReminderReceipt>().HasKey(x => x.Key);
        model.Entity<MarketSample>().HasKey(x => new { x.Symbol, x.Timestamp });
    }
}
