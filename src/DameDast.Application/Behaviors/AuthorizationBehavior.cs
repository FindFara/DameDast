using MediatR;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.Common;

namespace DameDast.Application.Behaviors;

public sealed class AuthorizationBehavior<TRequest, TResponse>(ICurrentUser currentUser) : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    public Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (request is IAuthenticatedRequest)
            currentUser.RequireId();
        if (request is DameDast.Application.Features.Administration.IAdminRequest && !currentUser.IsAdmin)
            throw new DameDast.Application.Features.Administration.AdminForbiddenException();
        return next();
    }
}
