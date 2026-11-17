namespace Poolo.Infrastructure;

public sealed class DeviceSubscription
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Endpoint { get; set; } = "";
    public string P256dh { get; set; } = "";
    public string Auth { get; set; } = "";
    public string Language { get; set; } = "en";
}
