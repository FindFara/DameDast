using DameDast.Domain;
using DameDast.Application.Features.Organizer.Models;

namespace DameDast.Application.Interfaces.Notes;

public interface INoteService
{
    IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records);
    int OpenTasks(IReadOnlyList<FinanceRecord> records);
}
