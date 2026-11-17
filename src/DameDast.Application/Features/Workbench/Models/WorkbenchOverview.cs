using DameDast.Domain;

namespace DameDast.Application.Features.Workbench.Models;

public sealed record WorkbenchOverview(long Revision, FinanceRecord? Record);
