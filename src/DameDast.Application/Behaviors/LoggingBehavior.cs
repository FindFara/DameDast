using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace DameDast.Application.Behaviors;

// Log metadata only: requests and responses may contain private financial or account data.
public sealed class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>>? logger = null)
    : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var log = logger ?? NullLogger<LoggingBehavior<TRequest, TResponse>>.Instance;
        var name = typeof(TRequest).Name;
        var timer = Stopwatch.StartNew();
        using var scope = log.BeginScope(new Dictionary<string, object> { ["RequestType"] = name, ["TraceId"] = Activity.Current?.TraceId.ToString() ?? "" });
        log.LogInformation("Handling {RequestType}", name);
        try
        {
            var response = await next();
            log.LogInformation("Handled {RequestType} in {ElapsedMs} ms", name, timer.ElapsedMilliseconds);
            return response;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            log.LogInformation("Cancelled {RequestType} after {ElapsedMs} ms", name, timer.ElapsedMilliseconds);
            throw;
        }
        catch (Exception exception)
        {
            // Exception messages can contain submitted values; record type, not payload/message.
            log.LogWarning("Failed {RequestType} with {ExceptionType} after {ElapsedMs} ms", name, exception.GetType().Name, timer.ElapsedMilliseconds);
            throw;
        }
    }
}
