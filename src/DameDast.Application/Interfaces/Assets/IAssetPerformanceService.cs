using DameDast.Domain;
namespace DameDast.Application.Interfaces.Assets;
public interface IAssetPerformanceService
{
    AssetGain Calculate(AssetPosition position, DateOnly asOf, decimal? value, decimal? observedQuantity = null);
}
