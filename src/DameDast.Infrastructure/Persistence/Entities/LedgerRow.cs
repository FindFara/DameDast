namespace DameDast.Infrastructure;

public sealed class LedgerRow
{
    public string UserId { get; set; } = "";
    public long Revision { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<FinanceRecordRow> Records { get; set; } = [];
}
