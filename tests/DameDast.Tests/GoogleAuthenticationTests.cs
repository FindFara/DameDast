using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DameDast.Web.Configuration;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DameDast.Tests;

public sealed class GoogleAuthenticationTests
{
    [Fact]
    public void CredentialsUseCanonicalSettingsThenEnvironmentAliasesAndReportOnlyMissingNames()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> {
            ["GOOGLE_CLIENT_ID"] = " alias-client ", ["GOOGLE_CLIENT_SECRET"] = " alias-secret "
        }).Build();
        var alias = GoogleAuthenticationSettings.Read(config);
        Assert.True(alias.Settings.Configured); Assert.Equal("alias-client", alias.ClientId); Assert.Empty(alias.Settings.MissingSettings);
        config["Authentication:Google:ClientId"] = "canonical-client";
        Assert.Equal("canonical-client", GoogleAuthenticationSettings.Read(config).ClientId);
        config["GOOGLE_CLIENT_SECRET"] = " ";
        var missing = GoogleAuthenticationSettings.Read(config).Settings;
        Assert.False(missing.Configured); Assert.Equal(new[] { "Authentication:Google:ClientSecret" }, missing.MissingSettings);
    }

    [Fact]
    public async Task LocalhostChallengeUsesTheExactCallbackAndNeverExposesTheSecret()
    {
        await using var original = new FinanceTests.TestApp();
        await using var app = Configure(original);
        using var client = app.CreateClient(new() { BaseAddress = new("http://localhost:5000"), AllowAutoRedirect = false });
        var status = await client.GetFromJsonAsync<JsonElement>("/auth/google/status");
        Assert.True(status.GetProperty("configured").GetBoolean());
        Assert.Equal("http://localhost:5000/signin-google", status.GetProperty("callbackUrl").GetString());
        Assert.Empty(status.GetProperty("missingSettings").EnumerateArray());
        var response = await client.GetAsync("/auth/google?returnUrl=https://untrusted.example");
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        var target = response.Headers.Location!; var query = QueryHelpers.ParseQuery(target.Query);
        Assert.Equal("accounts.google.com", target.Host);
        Assert.Equal("http://localhost:5000/signin-google", query["redirect_uri"].ToString());
        Assert.Equal("test-client.apps.googleusercontent.com", query["client_id"].ToString());
        Assert.True(query.ContainsKey("code_challenge")); Assert.DoesNotContain("test-server-secret", target.ToString());
        var options = app.Services.GetRequiredService<IOptionsMonitor<GoogleOptions>>().Get("Google");
        Assert.Equal("/", options.StateDataFormat.Unprotect(query["state"])!.RedirectUri);
    }

    [Fact]
    public async Task AuthorizationCallbackExchangesTheCodeCreatesASessionAndRejectsMissingCorrelation()
    {
        await using var original = new FinanceTests.TestApp();
        await using var app = Configure(original);
        using var client = app.CreateClient(new() { BaseAddress = new("https://localhost:5000"), AllowAutoRedirect = false });
        var challenge = await client.GetAsync("/auth/google?returnUrl=" + Uri.EscapeDataString("/#workbench"));
        var state = QueryHelpers.ParseQuery(challenge.Headers.Location!.Query)["state"].ToString();
        var callback = await client.GetAsync("/signin-google?code=test-code&state=" + Uri.EscapeDataString(state));
        Assert.Equal(HttpStatusCode.Redirect, callback.StatusCode); Assert.Equal("/#workbench", callback.Headers.Location!.ToString());
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session");
        Assert.True(session.GetProperty("authenticated").GetBoolean()); Assert.True(session.GetProperty("googleConfigured").GetBoolean());
        Assert.Equal("Test Person", session.GetProperty("name").GetString());
        using var other = app.CreateClient(new() { BaseAddress = new("https://localhost:5000"), AllowAutoRedirect = false });
        var invalid = await other.GetAsync("/signin-google?code=test-code&state=" + Uri.EscapeDataString(state));
        Assert.Equal("/?authError=correlation", invalid.Headers.Location!.ToString());
    }

    private static WebApplicationFactory<Program> Configure(FinanceTests.TestApp original) => original.WithWebHostBuilder(builder =>
    {
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string,string?> {
            ["Authentication:Google:ClientId"] = "test-client.apps.googleusercontent.com", ["Authentication:Google:ClientSecret"] = "test-server-secret"
        }));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<GoogleAuthenticationSettings>();
            services.AddGoogleSignIn(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> {
                ["Authentication:Google:ClientId"] = "test-client.apps.googleusercontent.com", ["Authentication:Google:ClientSecret"] = "test-server-secret"
            }).Build());
            services.Configure<AuthenticationOptions>(options => { options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme; options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme; });
            services.Configure<GoogleOptions>("Google", options => options.Backchannel = new HttpClient(new GoogleBackchannel()));
        });
    });
    private sealed class GoogleBackchannel : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var json = request.Method == HttpMethod.Post
                ? "{\"access_token\":\"test-token\",\"token_type\":\"Bearer\",\"expires_in\":3600}"
                : "{\"id\":\"test-google-user\",\"sub\":\"test-google-user\",\"name\":\"Test Person\",\"email\":\"person@example.test\",\"verified_email\":true}";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
        }
    }
}
