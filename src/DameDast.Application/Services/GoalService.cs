using DameDast.Application.Interfaces.Goals;
using DameDast.Domain;

namespace DameDast.Application.Services;

public sealed class GoalService : IGoalService
{
    public IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records) => records
        .Where(x => !x.Deleted && x.Kind == "goal" && FinanceRules.Read<Goal>(x.Data).Pinned).ToArray();
}
