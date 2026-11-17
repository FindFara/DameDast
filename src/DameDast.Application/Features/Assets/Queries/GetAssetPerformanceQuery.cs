using MediatR;
using DameDast.Application.Interfaces.Assets;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Common;
using DameDast.Domain;
namespace DameDast.Application.Features.Assets.Queries;
public sealed record GetAssetPerformanceQuery(Guid Id) : IRequest<AssetGain>, IAuthenticatedRequest;
public sealed class GetAssetPerformanceQueryHandler(IFinanceService finance, IAssetPerformanceService performance,
    ICurrentUser user, TimeProvider clock) : IRequestHandler<GetAssetPerformanceQuery, AssetGain>
{
    public async Task<AssetGain> Handle(GetAssetPerformanceQuery request, CancellationToken cancellationToken)
    {
        var snapshot = await finance.ReadAsync(user.RequireId(), cancellationToken);
        var record = snapshot.Records.FirstOrDefault(x => x.Id == request.Id && !x.Deleted && x.Kind == "assetPosition")
            ?? throw new FinanceException("Asset not found.");
        var position = FinanceRules.Read<AssetPosition>(record.Data);
        var today = clock.TehranToday();
        var valuation = position.Valuations.Where(x => x.Date <= today).OrderByDescending(x => x.Date).FirstOrDefault();
        return performance.Calculate(position, valuation?.Date ?? today, valuation is null ? null : AssetRules.Number(valuation.ValueToman, 2));
    }
}
