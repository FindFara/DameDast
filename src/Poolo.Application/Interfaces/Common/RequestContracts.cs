namespace Poolo.Application.Interfaces.Common;

public interface IAuthenticatedRequest;
public interface IRequestValidator<in TRequest>
{
    void Validate(TRequest request);
}
