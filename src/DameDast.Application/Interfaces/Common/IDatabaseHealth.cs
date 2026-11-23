namespace DameDast.Application.Interfaces.Common;

public interface IDatabaseHealth
{
    Task<bool> CanConnectAsync(CancellationToken cancellationToken);
}
