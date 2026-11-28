using DameDast.Application;
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
app.UseMiddleware<UserDirectoryMiddleware>();
app.UseMiddleware<AccountScopeMiddleware>();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();
// Private, read-only access keeps historical linked documents exportable after canvas retirement.
app.MapGet("/api/legacy/whiteboards/{id:guid}", async (Guid id, DameDast.Application.Interfaces.Sessions.ICurrentUser user, MediatR.ISender sender, CancellationToken ct) =>
    Results.Ok(await sender.Send(new DameDast.Application.Features.Whiteboards.GetWhiteboardQuery(id, user.RequireId(), null), ct)));
app.MapMethods("/api/whiteboards/{**path}", ["GET", "POST", "PUT", "DELETE"], () => Results.StatusCode(StatusCodes.Status410Gone));
app.MapMethods("/hubs/whiteboard/{**path}", ["GET", "POST", "DELETE"], () => Results.StatusCode(StatusCodes.Status410Gone));
app.MapFallbackToFile("index.html");
await app.Services.InitializeInfrastructureAsync(app.Lifetime.ApplicationStopping);
await app.RunAsync();
public partial class Program;
