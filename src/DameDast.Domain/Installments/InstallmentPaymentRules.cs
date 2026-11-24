using System.Text.Json;

namespace DameDast.Domain;

// One installment mutation and its expense share the repository transaction and operation receipt.
public static class InstallmentPaymentRules
{
    public static void CheckChange(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        var current = records.SingleOrDefault(r => r.Id == change.Id);
        if (change.Kind == "transaction" && (current is not null && FinanceRules.Read<Movement>(current.Data).InstallmentId is not null
            || !change.Delete && FinanceRules.Read<Movement>(change.Data).InstallmentId is not null))
            throw new FinanceException("Edit or reverse this payment from its installment.");
        if (change.Kind == "installment" && current is { Deleted: false })
        {
            var old = FinanceRules.Read<Installment>(current.Data);
            if (change.Delete && old.Payment is not null) throw new FinanceException("Reverse this payment before deleting the installment.");
            if (!change.Delete && old.Payment is not null && FinanceRules.Read<Installment>(change.Data) is { Paid: true } next
                && next.Payment?.TransactionId != old.Payment.TransactionId)
                throw new FinanceException("Reverse this payment before replacing it.");
        }
    }

    public static void Validate(IReadOnlyList<FinanceRecord> records, Installment installment, Guid id)
    {
        if (installment.Payment is not { } payment) return; // Preserve historical tracking-only paid flags.
        if (!installment.Paid || payment.TransactionId == Guid.Empty || payment.TransactionId == id
            || payment.Date.Year is < 2000 or > 2100 || !records.Any(r => r.Id == payment.AccountId && !r.Deleted && r.Kind == "account"))
            throw new FinanceException("Choose an account and payment date.");
        PlanningRules.RequireCategory(records, payment.Category);
        var transaction = records.SingleOrDefault(r => r.Id == payment.TransactionId);
        if (transaction is not null && (transaction.Kind != "transaction" || transaction.Deleted || FinanceRules.Read<Movement>(transaction.Data).InstallmentId != id))
            throw new FinanceException("This payment transaction is already in use.");
    }

    public static IReadOnlyList<FinanceRecord> Apply(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        var updated = FinanceRules.Apply(records, change);
        if (change.Kind != "installment" || change.Delete) return [updated];
        var installment = FinanceRules.Read<Installment>(updated.Data);
        var old = records.SingleOrDefault(r => r.Id == change.Id);
        var payment = installment.Payment ?? (old is null ? null : FinanceRules.Read<Installment>(old.Data).Payment);
        if (payment is null) return [updated];
        var previous = records.SingleOrDefault(r => r.Id == payment.TransactionId);
        var movement = new Movement(payment.AccountId, null, "expense", installment.Amount, payment.Category, payment.Date,
            installment.Title, InstallmentId: change.Id, ProjectId: installment.ProjectId);
        var effect = new Mutation(change.OperationId, payment.TransactionId, "transaction", previous?.Version ?? 0,
            installment.Payment is null, JsonSerializer.SerializeToElement(movement, FinanceRules.Json));
        return [updated, FinanceRules.Apply(records, effect, paymentEffect: true)];
    }
}
