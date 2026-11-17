using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Common;
using Poolo.Domain;

namespace Poolo.Application.Features.FinanceRecords.Validation;

public sealed class SyncBatchValidator<TRequest> : IRequestValidator<TRequest> where TRequest : ISyncRequest
{
    public void Validate(TRequest request)
    {
        var changes = request.Input?.Changes;
        if (changes is null || changes.Count is < 1 or > 100 || changes.Any(x => x is null))
            throw new FinanceException("A sync request must contain between 1 and 100 changes.");
        if (changes.Select(x => x.OperationId).Distinct().Count() != changes.Count)
            throw new FinanceException("Operation IDs must be unique within a request.");
    }
}
