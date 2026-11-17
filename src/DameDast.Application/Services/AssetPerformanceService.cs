using DameDast.Application.Interfaces.Assets;
using DameDast.Domain;
namespace DameDast.Application.Services;
public sealed class AssetPerformanceService : IAssetPerformanceService
{
    public AssetGain Calculate(AssetPosition position, DateOnly asOf, decimal? value, decimal? observedQuantity = null)
        => AssetRules.Gain(position, asOf, value, observedQuantity);
}
