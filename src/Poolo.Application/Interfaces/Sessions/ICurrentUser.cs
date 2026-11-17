namespace Poolo.Application.Interfaces.Sessions;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }

    string? Id { get; }

    string? Name { get; }

    string RequireId();
}
