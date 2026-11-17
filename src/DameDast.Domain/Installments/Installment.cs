namespace DameDast.Domain;

public sealed record Installment(string Title, decimal Amount, DateOnly DueDate, bool Paid, int ReminderDays);
