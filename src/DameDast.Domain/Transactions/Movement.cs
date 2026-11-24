namespace DameDast.Domain;

public sealed record Movement(Guid AccountId, Guid? DestinationId, string Type, decimal Amount, string Category, DateOnly Date, string Note, Guid? RecurringExpenseId = null, string? RecurringMonth = null, Guid? InstallmentId = null, Guid? ProjectId = null);
