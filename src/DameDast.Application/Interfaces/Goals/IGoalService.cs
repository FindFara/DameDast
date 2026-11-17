using DameDast.Domain;
using DameDast.Application.Features.Organizer.Models;

namespace DameDast.Application.Interfaces.Goals;

public interface IGoalService
{
    IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records);
}
