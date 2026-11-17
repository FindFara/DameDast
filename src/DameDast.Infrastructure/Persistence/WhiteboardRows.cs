namespace DameDast.Infrastructure;

public sealed class WhiteboardRow
{
    public Guid Id { get; set; }
    public required string OwnerId { get; set; }
    public long Revision { get; set; }
    public required string State { get; set; }
    public long UpdatedAt { get; set; }
}
public sealed class WhiteboardOperation
{
    public Guid DocumentId { get; set; }
    public Guid OperationId { get; set; }
    public required string Digest { get; set; }
}
public sealed class WhiteboardShare
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public required string TokenHash { get; set; }
    public required string Role { get; set; }
    public long ExpiresAt { get; set; }
    public bool Revoked { get; set; }
}
public sealed class WhiteboardLibrary
{
    public required string UserId { get; set; }
    public long Revision { get; set; }
    public required string Items { get; set; }
}
