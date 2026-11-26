using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
namespace DameDast.Web.Configuration;

public static class GoogleAuthenticationExtensions
{
    public static IServiceCollection AddGoogleSignIn(this IServiceCollection services, IConfiguration configuration)
    {
        var (google, clientId, clientSecret) = GoogleAuthenticationSettings.Read(configuration);
        services.AddSingleton(google);
        if (!google.Configured)
            return services;
        services.AddAuthentication().AddGoogle(options =>
        {
            options.ClientId = clientId!;
            options.ClientSecret = clientSecret!;
            options.SaveTokens = false;
            options.ClaimActions.MapJsonKey("urn:google:picture", "picture", "url");
            options.UsePkce = true;
            options.Scope.Add("openid");
            options.Events.OnRedirectToAuthorizationEndpoint = context =>
            {
                context.Response.Redirect(context.RedirectUri + "&prompt=select_account");
                return Task.CompletedTask;
            };
            options.Events.OnRemoteFailure = context =>
            {
                context.HandleResponse();
                var message = context.Failure?.Message ?? "";
                var code = message.Contains("access_denied", StringComparison.OrdinalIgnoreCase) ? "denied"
                    : message.Contains("Correlation", StringComparison.OrdinalIgnoreCase) ? "correlation"
                    : message.Contains("invalid_client", StringComparison.OrdinalIgnoreCase) ? "credentials"
                    : "google";
                context.Response.Redirect("/?authError=" + code);
                return Task.CompletedTask;
            };
        });
        return services;
    }
}
