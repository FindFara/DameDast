using DameDast.Application.Interfaces.Workbench;
using DameDast.Domain;

namespace DameDast.Application.Services;

public sealed class WorkbenchService : IWorkbenchService
{
    public FinanceRecord? Read(IReadOnlyList<FinanceRecord> records) =>
        records.SingleOrDefault(record => !record.Deleted && record.Kind == "workbench");
}
