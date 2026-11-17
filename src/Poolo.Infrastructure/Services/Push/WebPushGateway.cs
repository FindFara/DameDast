using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Poolo.Application.Features.Reminders.Models;
using Poolo.Application.Interfaces.Reminders;
using Poolo.Application.Services;
using WebPush;

namespace Poolo.Infrastructure.Services.Push;

public sealed class WebPushGateway(IConfiguration configuration, ILogger<WebPushGateway> logger) : IPushGateway
{
    private VapidDetails? keys;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public PushConfiguration Configuration => new(keys is not null, keys?.PublicKey);

    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        var path = Path.Combine(configuration["Storage:DataDirectory"] ?? "data", "keys", "vapid.json");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        if (File.Exists(path))
        {
            await using var file = File.OpenRead(path);
            keys = await JsonSerializer.DeserializeAsync<VapidDetails>(file, cancellationToken: cancellationToken);
        }
        else
        {
            keys = VapidHelper.GenerateVapidKeys();
            keys.Subject = configuration["Push:Subject"] is { Length: > 0 } subject ? subject : "https://" + (configuration["AllowedHosts"] ?? "localhost").Split(';')[0];
            var temporary = path + ".tmp";
            await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(keys), cancellationToken);
            if (!OperatingSystem.IsWindows())
                File.SetUnixFileMode(temporary, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            File.Move(temporary, path);
        }

        if (configuration["Push:Subject"] is { Length: > 0 } configuredSubject && keys is not null)
            keys.Subject = configuredSubject;
    }

    public async Task<PushDeliveryResult> SendAsync(PushDevice device, PushMessage message, CancellationToken cancellationToken)
    {
        if (keys is null)
            return PushDeliveryResult.RetryLater;
        PushRegistrationRules.ValidateEndpoint(device.Endpoint);
        try
        {
            using var client = new WebPushClient();
            var payload = JsonSerializer.Serialize(message, Json);
            await client.SendNotificationAsync(new PushSubscription(device.Endpoint, device.P256dh, device.Auth), payload, keys, cancellationToken: cancellationToken);
            return PushDeliveryResult.Delivered;
        }
        catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
        {
            return PushDeliveryResult.Expired;
        }
        catch (WebPushException)
        {
            logger.LogWarning("Push delivery failed; it will be retried later");
            return PushDeliveryResult.RetryLater;
        }
    }
}
