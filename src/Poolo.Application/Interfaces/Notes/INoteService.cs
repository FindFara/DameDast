using Poolo.Domain;
using Poolo.Application.Features.Organizer.Models;

namespace Poolo.Application.Interfaces.Notes;

public interface INoteService
{
    IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records);
    int OpenTasks(IReadOnlyList<FinanceRecord> records);
}
