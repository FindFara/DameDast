using MediatR;
using DameDast.Application.Interfaces.Common;

namespace DameDast.Application.Behaviors;

public sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IRequestValidator<TRequest>> validators) : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    public Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        foreach (var validator in validators)
            validator.Validate(request);
        return next();
    }
}
