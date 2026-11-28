namespace DameDast.Application.Interfaces.Sessions;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }

    bool IsAdmin => false;

    string? Id { get; }

    string? Name { get; }

    string? PictureUrl { get; }

    string RequireId();
}
