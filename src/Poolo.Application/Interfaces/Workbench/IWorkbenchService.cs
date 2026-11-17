using Poolo.Domain;

namespace Poolo.Application.Interfaces.Workbench;

public interface IWorkbenchService
{
    FinanceRecord? Read(IReadOnlyList<FinanceRecord> records);
}
