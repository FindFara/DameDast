namespace DameDast.Web.Configuration;

public sealed record GoogleAuthenticationSettings(bool Configured, string[] MissingSettings)
{
    public static (GoogleAuthenticationSettings Settings, string? ClientId, string? ClientSecret) Read(IConfiguration configuration)
    {
        static string? Value(IConfiguration config, string key, string alias)
        {
            var value = config[key];
            if (string.IsNullOrWhiteSpace(value)) value = config[alias];
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
        var clientId = Value(configuration, "Authentication:Google:ClientId", "GOOGLE_CLIENT_ID");
        var clientSecret = Value(configuration, "Authentication:Google:ClientSecret", "GOOGLE_CLIENT_SECRET");
        var missing = new List<string>();
        if (clientId is null) missing.Add("Authentication:Google:ClientId");
        if (clientSecret is null) missing.Add("Authentication:Google:ClientSecret");
        return (new(missing.Count == 0, missing.ToArray()), clientId, clientSecret);
    }
}
