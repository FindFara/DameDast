using System.Text.Json;
using MediatR;
using Poolo.Application.Interfaces.Whiteboards;
using Poolo.Domain;

namespace Poolo.Application.Features.Whiteboards;

public sealed record GetWhiteboardQuery(Guid Id, string? UserId, string? Token) : IRequest<WhiteboardAccess>;
public sealed record UpdateWhiteboardCommand(Guid Id, string? UserId, string? Token, WhiteboardPatch Patch) : IRequest<WhiteboardState>;

public sealed class GetWhiteboardQueryHandler(IWhiteboardService service) : IRequestHandler<GetWhiteboardQuery, WhiteboardAccess>
{
    public Task<WhiteboardAccess> Handle(GetWhiteboardQuery request, CancellationToken cancellationToken) =>
        service.ReadAsync(request.Id, request.UserId, request.Token, cancellationToken);
}

public sealed class UpdateWhiteboardCommandHandler(IWhiteboardService service) : IRequestHandler<UpdateWhiteboardCommand, WhiteboardState>
{
    public Task<WhiteboardState> Handle(UpdateWhiteboardCommand request, CancellationToken cancellationToken) =>
        service.ApplyAsync(request.Id, request.UserId, request.Token, request.Patch, cancellationToken);
}

public sealed record GetWhiteboardLibraryQuery(string UserId) : IRequest<JsonElement>;
public sealed record SaveWhiteboardLibraryCommand(string UserId, JsonElement Input) : IRequest<JsonElement>;
public sealed record CreateWhiteboardShareCommand(Guid Id, string UserId, string Role) : IRequest<WhiteboardGrant>;
public sealed record RevokeWhiteboardSharesCommand(Guid Id, string UserId) : IRequest;

public sealed class GetWhiteboardLibraryQueryHandler(IWhiteboardService service) : IRequestHandler<GetWhiteboardLibraryQuery, JsonElement>
{
    public Task<JsonElement> Handle(GetWhiteboardLibraryQuery request, CancellationToken cancellationToken) =>
        service.ReadLibraryAsync(request.UserId, cancellationToken);
}

public sealed class SaveWhiteboardLibraryCommandHandler(IWhiteboardService service) : IRequestHandler<SaveWhiteboardLibraryCommand, JsonElement>
{
    public async Task<JsonElement> Handle(SaveWhiteboardLibraryCommand request, CancellationToken cancellationToken)
    {
        await service.SaveLibraryAsync(request.UserId, request.Input, cancellationToken);
        return await service.ReadLibraryAsync(request.UserId, cancellationToken);
    }
}

public sealed class CreateWhiteboardShareCommandHandler(IWhiteboardService service) : IRequestHandler<CreateWhiteboardShareCommand, WhiteboardGrant>
{
    public Task<WhiteboardGrant> Handle(CreateWhiteboardShareCommand request, CancellationToken cancellationToken) =>
        service.ShareAsync(request.Id, request.UserId, request.Role, cancellationToken);
}

public sealed class RevokeWhiteboardSharesCommandHandler(IWhiteboardService service) : IRequestHandler<RevokeWhiteboardSharesCommand>
{
    public Task Handle(RevokeWhiteboardSharesCommand request, CancellationToken cancellationToken) =>
        service.RevokeAsync(request.Id, request.UserId, cancellationToken);
}
