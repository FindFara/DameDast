using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Poolo.Infrastructure.Migrations;

[DbContext(typeof(FinanceDb))]
[Migration("202611150002_RemindersAndMarkets")]
public sealed class RemindersAndMarkets : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable("Subscriptions", columns: table => new
        {
            Id = table.Column<string>(type: "TEXT", nullable: false), UserId = table.Column<string>(type: "TEXT", nullable: false),
            Endpoint = table.Column<string>(type: "TEXT", nullable: false), P256dh = table.Column<string>(type: "TEXT", nullable: false), Auth = table.Column<string>(type: "TEXT", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_Subscriptions", x => x.Id));
        migrationBuilder.CreateTable("ReminderReceipts", columns: table => new
        {
            Key = table.Column<string>(type: "TEXT", nullable: false), SentAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_ReminderReceipts", x => x.Key));
        migrationBuilder.CreateTable("MarketSamples", columns: table => new
        {
            Symbol = table.Column<string>(type: "TEXT", nullable: false), Timestamp = table.Column<long>(type: "INTEGER", nullable: false), Price = table.Column<decimal>(type: "TEXT", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_MarketSamples", x => new { x.Symbol, x.Timestamp }));
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("Subscriptions");migrationBuilder.DropTable("ReminderReceipts");migrationBuilder.DropTable("MarketSamples");
    }
}
