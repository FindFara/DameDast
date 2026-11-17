using MediatR;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Common;

namespace Poolo.Application.Behaviors;

public sealed class AuthorizationBehavior<TRequest, TResponse>(ICurrentUser currentUser) : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    public Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (request is IAuthenticatedRequest)
            currentUser.RequireId();
        return next();
    }
}
