using System.Text.Json;
using Poolo.Domain;

namespace Poolo.Application.Interfaces.Whiteboards;

public interface IWhiteboardRepository
{
    Task<WhiteboardAccess> ReadAsync(Guid id, string? userId, string? token, CancellationToken cancellationToken);
    Task<WhiteboardState> ApplyAsync(Guid id, string? userId, string? token, WhiteboardPatch patch, CancellationToken cancellationToken);
    Task<WhiteboardGrant> ShareAsync(Guid id, string userId, string role, CancellationToken cancellationToken);
    Task RevokeAsync(Guid id, string userId, CancellationToken cancellationToken);
    Task<JsonElement> ReadLibraryAsync(string userId, CancellationToken cancellationToken);
    Task SaveLibraryAsync(string userId, JsonElement items, CancellationToken cancellationToken);
}
