namespace DameDast.Domain;

public sealed record Installment(string Title, decimal Amount, DateOnly DueDate, bool Paid, int ReminderDays, InstallmentPayment? Payment = null, Guid? ProjectId = null);
public sealed record InstallmentPayment(Guid TransactionId, Guid AccountId, DateOnly Date, string Category);
