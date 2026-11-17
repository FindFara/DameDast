namespace Poolo.Domain;

public sealed record Receivable(string Person, decimal Amount, decimal Returned, DateOnly LentOn, DateOnly? DueDate, string Note);
