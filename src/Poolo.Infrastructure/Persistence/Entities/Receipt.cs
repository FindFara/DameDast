namespace Poolo.Infrastructure;

public sealed class Receipt
{
    public string UserId { get; set; } = "";
    public Guid OperationId { get; set; }
    public string Payload { get; set; } = "";
}
