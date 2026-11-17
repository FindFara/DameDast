using Poolo.Application.Interfaces.Assets;
using Poolo.Domain;
namespace Poolo.Application.Services;
public sealed class AssetPerformanceService : IAssetPerformanceService
{
    public AssetGain Calculate(AssetPosition position, DateOnly asOf, decimal? value, decimal? observedQuantity = null)
        => AssetRules.Gain(position, asOf, value, observedQuantity);
}
