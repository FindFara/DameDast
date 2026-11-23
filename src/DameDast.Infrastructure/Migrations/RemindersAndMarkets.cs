using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DameDast.Infrastructure.Migrations;

[DbContext(typeof(FinanceDb))]
[Migration("20261115000200_RemindersAndMarkets")]
public sealed class RemindersAndMarkets : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable("Subscriptions", columns: table => new
        {
            Id = table.Column<string>(type: "text", nullable: false), UserId = table.Column<string>(type: "text", nullable: false),
            Endpoint = table.Column<string>(type: "text", nullable: false), P256dh = table.Column<string>(type: "text", nullable: false), Auth = table.Column<string>(type: "text", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_Subscriptions", x => x.Id));
        migrationBuilder.CreateTable("ReminderReceipts", columns: table => new
        {
            Key = table.Column<string>(type: "text", nullable: false), SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_ReminderReceipts", x => x.Key));
        migrationBuilder.CreateTable("MarketSamples", columns: table => new
        {
            Symbol = table.Column<string>(type: "text", nullable: false), Timestamp = table.Column<long>(type: "bigint", nullable: false), Price = table.Column<decimal>(type: "numeric", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_MarketSamples", x => new { x.Symbol, x.Timestamp }));
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("Subscriptions");migrationBuilder.DropTable("ReminderReceipts");migrationBuilder.DropTable("MarketSamples");
    }
}
