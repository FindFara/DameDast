using DameDast.Application;
using DameDast.Web.Whiteboards;
using DameDast.Infrastructure;
using DameDast.Web;
using DameDast.Web.Middleware;

var builder = WebApplication.CreateBuilder(args);
builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration)
    .AddPresentation(builder.Configuration);
var app = builder.Build();
app.UseForwardedHeaders();
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        if (context.File.Name is "sw.js" or "index.html")
            context.Context.Response.Headers.CacheControl = "no-cache";
    }
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapWhiteboards();
app.MapFallbackToFile("index.html");
await app.Services.InitializeInfrastructureAsync(app.Lifetime.ApplicationStopping);
await app.RunAsync();
public partial class Program;
