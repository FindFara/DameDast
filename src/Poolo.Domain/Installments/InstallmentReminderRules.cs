namespace Poolo.Domain;

public static class InstallmentReminderRules
{
    public static bool IsDue(Installment installment, DateOnly today) => !installment.Paid && installment.DueDate.DayNumber - today.DayNumber <= installment.ReminderDays && installment.DueDate.DayNumber - today.DayNumber >= -7;
    public static bool HasImportedDue(IEnumerable<FinanceRecord> records, DateOnly today) => records.Where(x => !x.Deleted && x.Kind == "externalSnapshot").Select(x =>
        FinanceRules.Read<ExternalSnapshot>(x.Data)).Where(x => x.Category == "installments").SelectMany(x => x.Items).Any(x => x.Status == "unpaid" && x.DueDate.HasValue && IsDue(new Installment(x.Label, 0, x.DueDate.Value, false, 3), today));
}
