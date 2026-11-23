using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DameDast.Infrastructure.Migrations;

[DbContext(typeof(FinanceDb))]
[Migration("20261115000100_Initial")]
public sealed class Initial : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable("Ledgers", columns: table => new
        {
            UserId = table.Column<string>(type: "text", nullable: false),
            Revision = table.Column<long>(type: "bigint", nullable: false),
            State = table.Column<string>(type: "text", nullable: false),
            UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_Ledgers", x => x.UserId));
        migrationBuilder.CreateTable("Receipts", columns: table => new
        {
            UserId = table.Column<string>(type: "text", nullable: false),
            OperationId = table.Column<Guid>(type: "uuid", nullable: false),
            Payload = table.Column<string>(type: "text", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_Receipts", x => new { x.UserId, x.OperationId }));
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("Receipts");
        migrationBuilder.DropTable("Ledgers");
    }
}
