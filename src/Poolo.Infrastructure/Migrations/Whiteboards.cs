using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Poolo.Infrastructure.Migrations;

[DbContext(typeof(FinanceDb))]
[Migration("202611160004_Whiteboards")]
public sealed class Whiteboards : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        CREATE TABLE Whiteboards (Id TEXT NOT NULL PRIMARY KEY, OwnerId TEXT NOT NULL, Revision INTEGER NOT NULL, State TEXT NOT NULL, UpdatedAt INTEGER NOT NULL);
        CREATE TABLE WhiteboardOperations (DocumentId TEXT NOT NULL, OperationId TEXT NOT NULL, Digest TEXT NOT NULL, PRIMARY KEY(DocumentId,OperationId));
        CREATE TABLE WhiteboardShares (Id TEXT NOT NULL PRIMARY KEY, DocumentId TEXT NOT NULL, TokenHash TEXT NOT NULL, Role TEXT NOT NULL, ExpiresAt INTEGER NOT NULL, Revoked INTEGER NOT NULL);
        CREATE UNIQUE INDEX IX_WhiteboardShares_TokenHash ON WhiteboardShares(TokenHash);
        CREATE TABLE WhiteboardLibraries (UserId TEXT NOT NULL PRIMARY KEY, Revision INTEGER NOT NULL, Items TEXT NOT NULL);
        """);
    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("DROP TABLE WhiteboardLibraries; DROP TABLE WhiteboardShares; DROP TABLE WhiteboardOperations; DROP TABLE Whiteboards;");
}
