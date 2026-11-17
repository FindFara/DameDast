using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DameDast.Infrastructure.Migrations;

[DbContext(typeof(FinanceDb))]
[Migration("202611150001_Initial")]
public sealed class Initial : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable("Ledgers", columns: table => new
        {
            UserId = table.Column<string>(type: "TEXT", nullable: false),
            Revision = table.Column<long>(type: "INTEGER", nullable: false),
            State = table.Column<string>(type: "TEXT", nullable: false),
            UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_Ledgers", x => x.UserId));
        migrationBuilder.CreateTable("Receipts", columns: table => new
        {
            UserId = table.Column<string>(type: "TEXT", nullable: false),
            OperationId = table.Column<Guid>(type: "TEXT", nullable: false),
            Payload = table.Column<string>(type: "TEXT", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_Receipts", x => new { x.UserId, x.OperationId }));
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("Receipts");
        migrationBuilder.DropTable("Ledgers");
    }
}

[DbContext(typeof(FinanceDb))]
public sealed class FinanceDbModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "10.0.0");
        modelBuilder.Entity<LedgerRow>(entity =>
        {
            entity.Property(x => x.UserId).HasColumnType("TEXT");
            entity.Property(x => x.Revision).IsConcurrencyToken().HasColumnType("INTEGER");
            entity.Property(x => x.State).IsRequired().HasColumnType("TEXT");
            entity.Property(x => x.UpdatedAt).HasColumnType("TEXT");
            entity.HasKey(x => x.UserId);
            entity.ToTable("Ledgers");
        });
        modelBuilder.Entity<Receipt>(entity =>
        {
            entity.Property(x => x.UserId).HasColumnType("TEXT");
            entity.Property(x => x.OperationId).HasColumnType("TEXT");
            entity.Property(x => x.Payload).IsRequired().HasColumnType("TEXT");
            entity.HasKey(x => new { x.UserId, x.OperationId });
            entity.ToTable("Receipts");
        });
        modelBuilder.Entity<DeviceSubscription>(entity =>
        {
            entity.Property(x => x.Id).HasColumnType("TEXT");entity.HasKey(x => x.Id);
            entity.Property(x => x.UserId).IsRequired().HasColumnType("TEXT");entity.Property(x => x.Endpoint).IsRequired().HasColumnType("TEXT");
            entity.Property(x => x.P256dh).IsRequired().HasColumnType("TEXT");entity.Property(x => x.Auth).IsRequired().HasColumnType("TEXT");entity.ToTable("Subscriptions");
            entity.Property(x => x.Language).IsRequired().HasColumnType("TEXT");
        });
        modelBuilder.Entity<ReminderReceipt>(entity =>
        {
            entity.Property(x => x.Key).HasColumnType("TEXT");entity.Property(x => x.SentAt).HasColumnType("TEXT");entity.HasKey(x => x.Key);entity.ToTable("ReminderReceipts");
        });
        modelBuilder.Entity<MarketSample>(entity =>
        {
            entity.Property(x => x.Symbol).HasColumnType("TEXT");entity.Property(x => x.Timestamp).HasColumnType("INTEGER");
            entity.Property(x => x.Price).HasColumnType("TEXT");entity.HasKey(x => new { x.Symbol, x.Timestamp });entity.ToTable("MarketSamples");
        });
        modelBuilder.Entity<WhiteboardRow>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("TEXT");
            entity.Property(x => x.OwnerId).IsRequired().HasColumnType("TEXT");
            entity.Property(x => x.Revision).IsConcurrencyToken().HasColumnType("INTEGER");
            entity.Property(x => x.State).IsRequired().HasColumnType("TEXT");
            entity.Property(x => x.UpdatedAt).HasColumnType("INTEGER");
            entity.HasKey(x => x.Id); entity.ToTable("Whiteboards");
        });
        modelBuilder.Entity<WhiteboardOperation>(entity =>
        {
            entity.Property(x => x.DocumentId).HasColumnType("TEXT");
            entity.Property(x => x.OperationId).HasColumnType("TEXT");
            entity.Property(x => x.Digest).IsRequired().HasColumnType("TEXT");
            entity.HasKey(x => new { x.DocumentId, x.OperationId }); entity.ToTable("WhiteboardOperations");
        });
        modelBuilder.Entity<WhiteboardShare>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("TEXT");
            entity.Property(x => x.DocumentId).HasColumnType("TEXT");
            entity.Property(x => x.TokenHash).IsRequired().HasColumnType("TEXT");
            entity.Property(x => x.Role).IsRequired().HasColumnType("TEXT");
            entity.Property(x => x.ExpiresAt).HasColumnType("INTEGER");
            entity.Property(x => x.Revoked).HasColumnType("INTEGER");
            entity.HasKey(x => x.Id); entity.HasIndex(x => x.TokenHash).IsUnique(); entity.ToTable("WhiteboardShares");
        });
        modelBuilder.Entity<WhiteboardLibrary>(entity =>
        {
            entity.Property(x => x.UserId).HasColumnType("TEXT");
            entity.Property(x => x.Revision).IsConcurrencyToken().HasColumnType("INTEGER");
            entity.Property(x => x.Items).IsRequired().HasColumnType("TEXT");
            entity.HasKey(x => x.UserId); entity.ToTable("WhiteboardLibraries");
        });
    }
}
