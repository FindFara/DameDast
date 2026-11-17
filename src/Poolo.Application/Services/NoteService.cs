using Poolo.Application.Interfaces.Notes;
using Poolo.Domain;

namespace Poolo.Application.Services;

public sealed class NoteService : INoteService
{
    public IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records) => records
        .Where(x => !x.Deleted && x.Kind == "note" && FinanceRules.Read<PersonalNote>(x.Data).Pinned).ToArray();

    public int OpenTasks(IReadOnlyList<FinanceRecord> records) => records.Where(x => !x.Deleted && x.Kind == "note")
        .SelectMany(x => FinanceRules.Read<PersonalNote>(x.Data).Checklist ?? []).Count(x => !x.Done);
}
