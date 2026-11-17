using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Web.Configuration;
using DameDast.Web.Filters;
using DameDast.Web.Identity;

namespace DameDast.Web;

public static class DependencyInjection
{
    public static IServiceCollection AddPresentation(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddSignalR(options => { options.MaximumReceiveMessageSize = 9_000_000; options.EnableDetailedErrors = false; });
        services.AddSingleton<DameDast.Web.Whiteboards.WhiteboardPresenceRegistry>();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<CsrfValidationFilter>();
        services.AddControllers(options => options.Filters.AddService<CsrfValidationFilter>()).ConfigureApiBehaviorOptions(options => options.InvalidModelStateResponseFactory = _ => new BadRequestObjectResult(new { error = "Invalid request. Check the submitted fields." }));
        services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(configuration["Storage:DataDirectory"] ?? "data", "keys"))).SetApplicationName("DameDast");
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        });
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            if (System.Net.IPAddress.TryParse(configuration["ReverseProxy:KnownProxy"], out var proxy))
                options.KnownProxies.Add(proxy);
        });
        AddAuthentication(services, configuration);
        services.AddAuthorization();
        return services;
    }

    private static void AddAuthentication(IServiceCollection services, IConfiguration configuration)
    {
        var authentication = services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
        {
            options.Cookie.Name = "DameDast.Session";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
            options.ExpireTimeSpan = TimeSpan.FromDays(14);
            options.SlidingExpiration = true;
            options.Events.OnRedirectToLogin = context => SetStatusCode(context.Response, StatusCodes.Status401Unauthorized);
            options.Events.OnRedirectToAccessDenied = context => SetStatusCode(context.Response, StatusCodes.Status403Forbidden);
        });
        var configured = !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientId"]) && !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientSecret"]);
        services.AddSingleton(new GoogleAuthenticationSettings(configured));
        if (!configured)
            return;
        authentication.AddGoogle(options =>
        {
            options.ClientId = configuration["Authentication:Google:ClientId"]!;
            options.ClientSecret = configuration["Authentication:Google:ClientSecret"]!;
            options.SaveTokens = false;
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
                context.Response.Redirect("/?authError=google");
                return Task.CompletedTask;
            };
        });
    }

    private static Task SetStatusCode(HttpResponse response, int statusCode)
    {
        response.StatusCode = statusCode;
        return Task.CompletedTask;
    }
}
