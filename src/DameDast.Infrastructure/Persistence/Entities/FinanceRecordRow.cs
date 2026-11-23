namespace DameDast.Infrastructure;

public sealed class FinanceRecordRow
{
    public string UserId { get; set; } = "";
    public Guid Id { get; set; }
    public string Kind { get; set; } = "";
    public long Version { get; set; }
    public bool Deleted { get; set; }
    public long SortOrder { get; set; }
    public string Data { get; set; } = "null";
}
