namespace Poolo.Application.Features.Reminders.Models;

public sealed record PushKeys(string P256dh, string Auth);
public sealed record PushRegistration(string Endpoint, PushKeys Keys, string Language = "en");
public sealed record PushDevice(string Id, string UserId, string Endpoint, string P256dh, string Auth, string Language);
public sealed record PushConfiguration(bool Configured, string? PublicKey);
public sealed record PushMessage(string Title, string Body, string Lang, string Dir, string Url, string Tag);
public enum PushDeliveryResult
{
    Delivered,
    Expired,
    RetryLater
}
