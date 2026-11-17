namespace Poolo.Infrastructure;

public sealed class MarketSample
{
    public string Symbol { get; set; } = "";
    public long Timestamp { get; set; }
    public decimal Price { get; set; }
}
