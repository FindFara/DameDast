using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DameDast.Infrastructure.Migrations;

[DbContext(typeof(FinanceDb))]
[Migration("20261127000100_PushNotificationPreferences")]
public sealed class PushNotificationPreferences : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(name: "RemindersEnabled", table: "Subscriptions", type: "boolean", nullable: false, defaultValue: true);
        migrationBuilder.AddColumn<bool>(name: "InstallmentsEnabled", table: "Subscriptions", type: "boolean", nullable: false, defaultValue: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "RemindersEnabled", table: "Subscriptions");
        migrationBuilder.DropColumn(name: "InstallmentsEnabled", table: "Subscriptions");
    }
}
