using DameDast.Application.Features.Reminders.Models;
using DameDast.Domain;

namespace DameDast.Application.Services;

public static class PushRegistrationRules
{
    public static void Validate(PushRegistration input)
    {
        ValidateEndpoint(input.Endpoint);
        if (input.Keys is null || !ValidKey(input.Keys.Auth, 16) || !ValidKey(input.Keys.P256dh, 65))
            throw new FinanceException("Invalid browser push keys.");
        if (input.Language is not ("en" or "fa"))
            throw new FinanceException("Unsupported notification language.");
    }

    public static void ValidateEndpoint(string endpoint)
    {
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != "https" || !uri.IsDefaultPort || !string.IsNullOrEmpty(uri.UserInfo) || !SupportedHost(uri.Host))
            throw new FinanceException("Unsupported push service endpoint.");
    }

    private static bool SupportedHost(string host) => host == "fcm.googleapis.com" || host == "updates.push.services.mozilla.com" || host.EndsWith(".push.services.mozilla.com", StringComparison.OrdinalIgnoreCase) || host.EndsWith(".push.apple.com", StringComparison.OrdinalIgnoreCase);
    private static bool ValidKey(string value, int bytes)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 120)
            return false;
        try
        {
            var normalized = value.Replace('-', '+').Replace('_', '/');
            normalized = normalized.PadRight((normalized.Length + 3) / 4 * 4, '=');
            return Convert.FromBase64String(normalized).Length == bytes;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
