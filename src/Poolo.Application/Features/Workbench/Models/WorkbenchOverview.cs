using Poolo.Domain;

namespace Poolo.Application.Features.Workbench.Models;

public sealed record WorkbenchOverview(long Revision, FinanceRecord? Record);
