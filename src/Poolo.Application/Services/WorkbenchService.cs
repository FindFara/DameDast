using Poolo.Application.Interfaces.Workbench;
using Poolo.Domain;

namespace Poolo.Application.Services;

public sealed class WorkbenchService : IWorkbenchService
{
    public FinanceRecord? Read(IReadOnlyList<FinanceRecord> records) =>
        records.SingleOrDefault(record => !record.Deleted && record.Kind == "workbench");
}
