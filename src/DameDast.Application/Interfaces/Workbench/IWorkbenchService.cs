using DameDast.Domain;

namespace DameDast.Application.Interfaces.Workbench;

public interface IWorkbenchService
{
    FinanceRecord? Read(IReadOnlyList<FinanceRecord> records);
}
