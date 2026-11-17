using System.Text.Json;
using DameDast.Application.Interfaces.Whiteboards;
using DameDast.Domain;

namespace DameDast.Application.Services;

public sealed class WhiteboardService(IWhiteboardRepository repository) : IWhiteboardService
{
    public Task<WhiteboardAccess> ReadAsync(Guid id, string? userId, string? token, CancellationToken cancellationToken) =>
        repository.ReadAsync(id, userId, token, cancellationToken);

    public Task<WhiteboardState> ApplyAsync(Guid id, string? userId, string? token, WhiteboardPatch patch, CancellationToken cancellationToken) =>
        repository.ApplyAsync(id, userId, token, patch, cancellationToken);

    public Task<WhiteboardGrant> ShareAsync(Guid id, string userId, string role, CancellationToken cancellationToken) =>
        repository.ShareAsync(id, userId, role, cancellationToken);

    public Task RevokeAsync(Guid id, string userId, CancellationToken cancellationToken) =>
        repository.RevokeAsync(id, userId, cancellationToken);

    public Task<JsonElement> ReadLibraryAsync(string userId, CancellationToken cancellationToken) =>
        repository.ReadLibraryAsync(userId, cancellationToken);

    public Task SaveLibraryAsync(string userId, JsonElement input, CancellationToken cancellationToken) =>
        repository.SaveLibraryAsync(userId, input, cancellationToken);
}
