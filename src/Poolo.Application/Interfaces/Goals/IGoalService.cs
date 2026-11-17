using Poolo.Domain;
using Poolo.Application.Features.Organizer.Models;

namespace Poolo.Application.Interfaces.Goals;

public interface IGoalService
{
    IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records);
}
