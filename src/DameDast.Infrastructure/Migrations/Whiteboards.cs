using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DameDast.Infrastructure.Migrations;

[DbContext(typeof(FinanceDb))]
[Migration("20261116000400_Whiteboards")]
public sealed class Whiteboards : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable("Whiteboards", columns: table => new
        {
            Id = table.Column<Guid>(type: "uuid", nullable: false),
            OwnerId = table.Column<string>(type: "text", nullable: false),
            Revision = table.Column<long>(type: "bigint", nullable: false),
            State = table.Column<string>(type: "text", nullable: false),
            UpdatedAt = table.Column<long>(type: "bigint", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_Whiteboards", x => x.Id));
        migrationBuilder.CreateTable("WhiteboardOperations", columns: table => new
        {
            DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
            OperationId = table.Column<Guid>(type: "uuid", nullable: false),
            Digest = table.Column<string>(type: "text", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_WhiteboardOperations", x => new { x.DocumentId, x.OperationId }));
        migrationBuilder.CreateTable("WhiteboardShares", columns: table => new
        {
            Id = table.Column<Guid>(type: "uuid", nullable: false),
            DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
            TokenHash = table.Column<string>(type: "text", nullable: false),
            Role = table.Column<string>(type: "text", nullable: false),
            ExpiresAt = table.Column<long>(type: "bigint", nullable: false),
            Revoked = table.Column<bool>(type: "boolean", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_WhiteboardShares", x => x.Id));
        migrationBuilder.CreateIndex("IX_WhiteboardShares_TokenHash", "WhiteboardShares", "TokenHash", unique: true);
        migrationBuilder.CreateTable("WhiteboardLibraries", columns: table => new
        {
            UserId = table.Column<string>(type: "text", nullable: false),
            Revision = table.Column<long>(type: "bigint", nullable: false),
            Items = table.Column<string>(type: "text", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_WhiteboardLibraries", x => x.UserId));
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("WhiteboardLibraries");
        migrationBuilder.DropTable("WhiteboardShares");
        migrationBuilder.DropTable("WhiteboardOperations");
        migrationBuilder.DropTable("Whiteboards");
    }
}
