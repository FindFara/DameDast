namespace Poolo.Domain;

public sealed record MonthlyExpense(string Title, decimal Amount, string Category, int Day, string StartMonth, string? EndMonth, Guid? AccountId);
