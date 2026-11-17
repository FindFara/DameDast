using Microsoft.AspNetCore.Antiforgery;
using Poolo.Domain;

namespace Poolo.Web.Middleware;

public sealed class ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (WhiteboardConflictException exception)
        {
            await WriteErrorAsync(context, 409, new { error = exception.Message, conflictIds = exception.ElementIds, state = exception.State });
        }
        catch (ConflictException exception)
        {
            await WriteErrorAsync(context, StatusCodes.Status409Conflict, new { error = exception.Message, recordId = exception.RecordId });
        }
        catch (FinanceException exception)
        {
            await WriteErrorAsync(context, StatusCodes.Status400BadRequest, new { error = exception.Message });
        }
        catch (System.Text.Json.JsonException)
        {
            await WriteErrorAsync(context, StatusCodes.Status400BadRequest, new { error = "Invalid document data. Your current document was kept." });
        }
        catch (AntiforgeryValidationException)
        {
            await WriteErrorAsync(context, StatusCodes.Status400BadRequest, new { error = "Your session expired. Refresh the page." });
        }
        catch (UnauthorizedAccessException)
        {
            await WriteErrorAsync(context, StatusCodes.Status401Unauthorized, new { error = "Sign in to continue." });
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "Request failed: {TraceIdentifier}", context.TraceIdentifier);
            await WriteErrorAsync(context, StatusCodes.Status500InternalServerError, new { error = "The server is unavailable. Your changes remain on this device." });
        }
    }

    private static Task WriteErrorAsync<T>(HttpContext context, int statusCode, T body)
    {
        context.Response.StatusCode = statusCode;
        return context.Response.WriteAsJsonAsync(body, context.RequestAborted);
    }
}
