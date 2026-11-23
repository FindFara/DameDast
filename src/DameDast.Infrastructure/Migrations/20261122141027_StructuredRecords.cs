using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DameDast.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class StructuredRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "TokenHash",
                table: "WhiteboardShares",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "WhiteboardShares",
                type: "character varying(8)",
                maxLength: 8,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.Sql("""ALTER TABLE "Whiteboards" ALTER COLUMN "State" TYPE jsonb USING "State"::jsonb;""");

            migrationBuilder.AlterColumn<string>(
                name: "OwnerId",
                table: "Whiteboards",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Digest",
                table: "WhiteboardOperations",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.Sql("""ALTER TABLE "WhiteboardLibraries" ALTER COLUMN "Items" TYPE jsonb USING "Items"::jsonb;""");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "WhiteboardLibraries",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Subscriptions",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Language",
                table: "Subscriptions",
                type: "character varying(8)",
                maxLength: 8,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Id",
                table: "Subscriptions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Receipts",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Symbol",
                table: "MarketSamples",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Ledgers",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateTable(
                name: "FinanceRecords",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false),
                    Deleted = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<long>(type: "bigint", nullable: false),
                    Data = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinanceRecords", x => new { x.UserId, x.Id });
                    table.CheckConstraint("CK_FinanceRecords_Kind", "length(\"Kind\") > 0");
                    table.CheckConstraint("CK_FinanceRecords_SortOrder", "\"SortOrder\" >= 0");
                    table.CheckConstraint("CK_FinanceRecords_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_FinanceRecords_Ledgers_UserId",
                        column: x => x.UserId,
                        principalTable: "Ledgers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            // Preserve record identity, tombstones, order and payloads before removing the old snapshot column.
            migrationBuilder.Sql("""
                INSERT INTO "FinanceRecords" ("UserId", "Id", "Kind", "Version", "Deleted", "SortOrder", "Data")
                SELECT ledger."UserId", (record.value->>'id')::uuid, record.value->>'kind',
                       (record.value->>'version')::bigint, (record.value->>'deleted')::boolean,
                       record.ordinality - 1, COALESCE(record.value->'data', 'null'::jsonb)
                FROM "Ledgers" AS ledger
                CROSS JOIN LATERAL jsonb_array_elements(ledger."State"::jsonb) WITH ORDINALITY AS record(value, ordinality);
                """);
            migrationBuilder.DropColumn(name: "State", table: "Ledgers");

            migrationBuilder.CreateIndex(
                name: "IX_WhiteboardShares_DocumentId",
                table: "WhiteboardShares",
                column: "DocumentId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_WhiteboardShares_Role",
                table: "WhiteboardShares",
                sql: "\"Role\" IN ('view', 'edit')");

            migrationBuilder.CreateIndex(
                name: "IX_Whiteboards_OwnerId_UpdatedAt",
                table: "Whiteboards",
                columns: new[] { "OwnerId", "UpdatedAt" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Whiteboards_Revision",
                table: "Whiteboards",
                sql: "\"Revision\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_WhiteboardLibraries_Revision",
                table: "WhiteboardLibraries",
                sql: "\"Revision\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_UserId",
                table: "Subscriptions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderReceipts_SentAt",
                table: "ReminderReceipts",
                column: "SentAt");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MarketSamples_Price",
                table: "MarketSamples",
                sql: "\"Price\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Ledgers_Revision",
                table: "Ledgers",
                sql: "\"Revision\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_FinanceRecords_UserId_Kind",
                table: "FinanceRecords",
                columns: new[] { "UserId", "Kind" },
                unique: true,
                filter: "\"Kind\" = 'workbench' AND NOT \"Deleted\"");

            migrationBuilder.CreateIndex(
                name: "IX_FinanceRecords_UserId_Kind_Deleted",
                table: "FinanceRecords",
                columns: new[] { "UserId", "Kind", "Deleted" });

            migrationBuilder.CreateIndex(
                name: "IX_FinanceRecords_UserId_SortOrder",
                table: "FinanceRecords",
                columns: new[] { "UserId", "SortOrder" });

            migrationBuilder.AddForeignKey(
                name: "FK_Receipts_Ledgers_UserId",
                table: "Receipts",
                column: "UserId",
                principalTable: "Ledgers",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WhiteboardOperations_Whiteboards_DocumentId",
                table: "WhiteboardOperations",
                column: "DocumentId",
                principalTable: "Whiteboards",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WhiteboardShares_Whiteboards_DocumentId",
                table: "WhiteboardShares",
                column: "DocumentId",
                principalTable: "Whiteboards",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(name: "State", table: "Ledgers", type: "text", nullable: false, defaultValue: "[]");
            migrationBuilder.Sql("""
                UPDATE "Ledgers" AS ledger SET "State" = COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', record."Id", 'kind', record."Kind", 'version', record."Version",
                        'deleted', record."Deleted", 'data', record."Data") ORDER BY record."SortOrder")
                    FROM "FinanceRecords" AS record WHERE record."UserId" = ledger."UserId"
                ), '[]'::jsonb)::text;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_Receipts_Ledgers_UserId",
                table: "Receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_WhiteboardOperations_Whiteboards_DocumentId",
                table: "WhiteboardOperations");

            migrationBuilder.DropForeignKey(
                name: "FK_WhiteboardShares_Whiteboards_DocumentId",
                table: "WhiteboardShares");

            migrationBuilder.DropTable(
                name: "FinanceRecords");

            migrationBuilder.DropIndex(
                name: "IX_WhiteboardShares_DocumentId",
                table: "WhiteboardShares");

            migrationBuilder.DropCheckConstraint(
                name: "CK_WhiteboardShares_Role",
                table: "WhiteboardShares");

            migrationBuilder.DropIndex(
                name: "IX_Whiteboards_OwnerId_UpdatedAt",
                table: "Whiteboards");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Whiteboards_Revision",
                table: "Whiteboards");

            migrationBuilder.DropCheckConstraint(
                name: "CK_WhiteboardLibraries_Revision",
                table: "WhiteboardLibraries");

            migrationBuilder.DropIndex(
                name: "IX_Subscriptions_UserId",
                table: "Subscriptions");

            migrationBuilder.DropIndex(
                name: "IX_ReminderReceipts_SentAt",
                table: "ReminderReceipts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MarketSamples_Price",
                table: "MarketSamples");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Ledgers_Revision",
                table: "Ledgers");

            migrationBuilder.AlterColumn<string>(
                name: "TokenHash",
                table: "WhiteboardShares",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "WhiteboardShares",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(8)",
                oldMaxLength: 8);

            migrationBuilder.AlterColumn<string>(
                name: "State",
                table: "Whiteboards",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "jsonb");

            migrationBuilder.AlterColumn<string>(
                name: "OwnerId",
                table: "Whiteboards",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(256)",
                oldMaxLength: 256);

            migrationBuilder.AlterColumn<string>(
                name: "Digest",
                table: "WhiteboardOperations",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "Items",
                table: "WhiteboardLibraries",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "jsonb");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "WhiteboardLibraries",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(256)",
                oldMaxLength: 256);

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Subscriptions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(256)",
                oldMaxLength: 256);

            migrationBuilder.AlterColumn<string>(
                name: "Language",
                table: "Subscriptions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(8)",
                oldMaxLength: 8);

            migrationBuilder.AlterColumn<string>(
                name: "Id",
                table: "Subscriptions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Receipts",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(256)",
                oldMaxLength: 256);

            migrationBuilder.AlterColumn<string>(
                name: "Symbol",
                table: "MarketSamples",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(128)",
                oldMaxLength: 128);

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Ledgers",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(256)",
                oldMaxLength: 256);

        }
    }
}
