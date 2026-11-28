using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DameDast.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdministrationAndPageViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PageViews",
                columns: table => new
                {
                    Page = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Views = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageViews", x => new { x.Page, x.Date });
                    table.CheckConstraint("CK_PageViews_Views", "\"Views\" >= 0");
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IsSystem = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Name);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    RoleName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => new { x.UserId, x.RoleName });
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleName",
                        column: x => x.RoleName,
                        principalTable: "Roles",
                        principalColumn: "Name",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PageViews_Date",
                table: "PageViews",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_NormalizedName",
                table: "Roles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_RoleName",
                table: "UserRoles",
                column: "RoleName");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email");
            migrationBuilder.Sql("""
                INSERT INTO "Roles" ("Name", "NormalizedName", "IsSystem") VALUES ('Admin', 'ADMIN', TRUE), ('User', 'USER', TRUE);
                INSERT INTO "Users" ("Id", "Name", "Email", "IsActive", "CreatedAt", "LastSeenAt")
                SELECT "Id", left("Id", 200), NULL, TRUE, CURRENT_TIMESTAMP, NULL FROM (
                    SELECT "UserId" AS "Id" FROM "Ledgers"
                    UNION SELECT "UserId" FROM "Subscriptions"
                    UNION SELECT "UserId" FROM "WhiteboardLibraries"
                    UNION SELECT "OwnerId" FROM "Whiteboards"
                ) AS owners WHERE length("Id") > 0;
                INSERT INTO "UserRoles" ("UserId", "RoleName") SELECT "Id", 'User' FROM "Users";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PageViews");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
