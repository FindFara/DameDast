namespace Poolo.Infrastructure;

public sealed class LedgerRow
{
    public string UserId { get; set; } = "";
    public long Revision { get; set; }
    public string State { get; set; } = "[]";
    public DateTimeOffset UpdatedAt { get; set; }
}
