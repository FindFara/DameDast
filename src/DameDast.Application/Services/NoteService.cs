using DameDast.Application.Interfaces.Notes;
using DameDast.Domain;

namespace DameDast.Application.Services;

public sealed class NoteService : INoteService
{
    public IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records) => records
        .Where(x => !x.Deleted && x.Kind == "note" && FinanceRules.Read<PersonalNote>(x.Data) is { Pinned: true, Status: "active" }).ToArray();

    public int OpenTasks(IReadOnlyList<FinanceRecord> records) => records.Where(x => !x.Deleted && x.Kind == "note" && FinanceRules.Read<PersonalNote>(x.Data).Status != "trashed")
        .SelectMany(x => FinanceRules.Read<PersonalNote>(x.Data).Checklist ?? []).Count(x => !x.Done);
}
