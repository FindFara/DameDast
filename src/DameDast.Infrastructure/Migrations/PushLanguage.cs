using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DameDast.Infrastructure.Migrations;

[DbContext(typeof(FinanceDb))]
[Migration("20261115000300_PushLanguage")]
public sealed class PushLanguage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.AddColumn<string>(
        name: "Language", table: "Subscriptions", type: "text", nullable: false, defaultValue: "en");

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropColumn(
        name: "Language", table: "Subscriptions");
}
