using System.Globalization;
using System.Text.Json;
using DameDast.Common;

namespace DameDast.Domain;

public sealed class FinanceException(string message) : Exception(message);
public sealed class ConflictException(Guid recordId) : Exception("Another device changed this record.")
{
    public Guid RecordId { get; } = recordId;
}

public static class FinanceRules
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static readonly string[] Categories = ["Food & drinks", "Shopping", "Transport", "Home", "Health", "Leisure", "Learning", "Salary", "Other income", "Other"];
    public static IReadOnlyList<FinanceRecord> ApplyWithEffects(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        var updated = InstallmentPaymentRules.Apply(records, change).ToList();
        if (change.Kind == "habit" && change.Delete)
            foreach (var log in records.Where(r => !r.Deleted && r.Kind == "habitLog" && Read<HabitLog>(r.Data).HabitId == change.Id))
                updated.Add(Apply(records, new Mutation(change.OperationId, log.Id, log.Kind, log.Version, true, default)));
        if (change.Kind == "noteLabel" && change.Delete)
            foreach (var record in records.Where(r => !r.Deleted && r.Kind == "note"))
            {
                var note = Read<PersonalNote>(record.Data);
                if (note.Labels?.Contains(change.Id) != true) continue;
                var payload = JsonSerializer.SerializeToElement(note with { Labels = note.Labels.Where(id => id != change.Id).ToArray() }, Json);
                updated.Add(Apply(records, new Mutation(change.OperationId, record.Id, record.Kind, record.Version, false, payload)));
            }
        return updated;
    }
    public static FinanceRecord Apply(IReadOnlyList<FinanceRecord> records, Mutation change, bool paymentEffect = false)
    {
        if (change.Id == Guid.Empty || change.OperationId == Guid.Empty || change.ExpectedVersion < 0)
            throw new FinanceException("Invalid change identifier or version.");
        var current = records.SingleOrDefault(x => x.Id == change.Id);
        if ((current?.Version ?? 0) != change.ExpectedVersion)
            throw new ConflictException(change.Id);
        if (current is not null && current.Kind != change.Kind)
            throw new FinanceException("A record cannot change its type.");
        if (!paymentEffect) InstallmentPaymentRules.CheckChange(records, change);
        if (change.Delete)
        {
            if (current is null || current.Deleted)
                throw new FinanceException("Record not found.");
            if (change.Kind == "project" && records.Any(r => !r.Deleted && r.Data.TryGetProperty("projectId", out var project) && project.ValueKind == JsonValueKind.String && project.TryGetGuid(out var referencedProject) && referencedProject == change.Id))
                throw new FinanceException("Move records out of this project before deleting it.");
            if (change.Kind == "category" && records.Any(r => PlanningRules.ReferencesCategory(r, "custom:" + change.Id)))
                throw new FinanceException("Move records using this category before deleting it.");
            if (change.Kind == "languageVocabulary" && records.Any(r => !r.Deleted && r.Kind == "languageEssay" && Read<LanguageEssay>(r.Data).VocabularyId == change.Id))
                throw new FinanceException("The daily words are used by an essay.");
            if (change.Kind == "account" && records.Where(x => x.Kind == "transaction" && !x.Deleted).Select(x => Read<Movement>(x.Data)).Any(x => x.AccountId == change.Id || x.DestinationId == change.Id))
                throw new FinanceException("Remove or move the transactions in this account first.");
            return current with
            {
                Version = current.Version + 1,
                Deleted = true
            };
        }

        if (current?.Deleted == true)
            throw new FinanceException("Deleted records cannot be edited. Create a new record.");
        if (change.Kind == "note" && current is not null && !change.Data.TryGetProperty("drawing", out _))
        {
            var note = Read<PersonalNote>(change.Data);
            change = change with { Data = JsonSerializer.SerializeToElement(note with { Drawing = Read<PersonalNote>(current.Data).Drawing }, Json) };
        }
        if (change.Kind == "note" && current is not null && !change.Data.TryGetProperty("whiteboardId", out _))
        {
            var note = Read<PersonalNote>(change.Data);
            var previous = Read<PersonalNote>(current.Data);
            change = change with { Data = JsonSerializer.SerializeToElement(note with { WhiteboardId = previous.WhiteboardId, WhiteboardPreview = previous.WhiteboardPreview }, Json) };
        }
        Validate(records, change);
        return new FinanceRecord(change.Id, change.Kind, (current?.Version ?? 0) + 1, false, change.Data.Clone());
    }

    private static void Validate(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        if (ExerciseRules.TryValidate(records, change)) return;
        if (DevelopmentRules.TryValidate(records, change)) return;
        if (LanguageRules.TryValidate(records, change)) return;
        ProductivityRules.ValidateProject(records, change);
        if (ProductivityRules.TryValidate(records, change)) return;
        if (OrganizerRules.TryValidate(records, change))
            return;
        if (PlanningRules.TryValidate(records, change))
            return;
        switch (change.Kind)
        {
            case "calendarEvent":
                CalendarRules.Validate(Read<CalendarEntry>(change.Data));
                break;
            case "workbench":
                WorkbenchRules.Validate(Read<WorkbenchLayout>(change.Data));
                if (records.Any(x => !x.Deleted && x.Kind == "workbench" && x.Id != change.Id))
                    throw new FinanceException("Only one workbench is allowed.");
                break;
            case "assetPosition":
                var position = Read<AssetPosition>(change.Data);
                AssetRules.Validate(position);
                if (position.SourceKey is { Length: > 0 } sourceKey && records.Any(x => !x.Deleted && x.Kind == "assetPosition"
                    && x.Id != change.Id && Read<AssetPosition>(x.Data).SourceKey == sourceKey))
                    throw new FinanceException("This asset already has a cost basis.");
                break;
            case "externalSnapshot":
                var external = Read<ExternalSnapshot>(change.Data);
                ExternalSnapshotRules.Validate(external);
                if (System.Text.Encoding.UTF8.GetByteCount(change.Data.GetRawText()) > 120_000)
                    throw new FinanceException("Portfolio snapshot is too large.");
                var others = records.Where(x => x.Kind == "externalSnapshot" && !x.Deleted && x.Id != change.Id).ToList();
                if (others.Count >= 20 || others.Select(x => Read<ExternalSnapshot>(x.Data)).Any(x => ExternalSnapshotRules.SameScope(x, external)))
                    throw new FinanceException("Duplicate portfolio source or too many sources.");
                var previous = records.SingleOrDefault(x => x.Id == change.Id);
                if (previous is not null)
                {
                    var old = Read<ExternalSnapshot>(previous.Data);
                    if (!ExternalSnapshotRules.SameScope(old, external) || external.CapturedAt < old.CapturedAt)
                        throw new FinanceException("An older capture cannot replace newer data or change its source.");
                }

                break;
            case "account":
                var wallet = Read<Wallet>(change.Data);
                Text(wallet.Name, 50, "Account name");
                if (Math.Abs(wallet.OpeningBalance) > 1_000_000_000_000 || decimal.Truncate(wallet.OpeningBalance) != wallet.OpeningBalance)
                    throw new FinanceException("Opening balance must be a whole-toman amount within the allowed range.");
                if (wallet.Color is not ("teal" or "blue" or "purple" or "orange"))
                    throw new FinanceException("Invalid account color.");
                ValidateCardNumber(wallet.CardNumber);
                break;
            case "transaction":
                var movement = Read<Movement>(change.Data);
                Money(movement.Amount);
                RequireAccount(records, movement.AccountId);
                if (movement.Type is not ("income" or "expense" or "transfer"))
                    throw new FinanceException("Invalid transaction type.");
                if (movement.Type == "transfer")
                {
                    if (!movement.DestinationId.HasValue || movement.DestinationId == movement.AccountId)
                        throw new FinanceException("Choose different source and destination accounts.");
                    RequireAccount(records, movement.DestinationId.Value);
                }
                else if (movement.DestinationId.HasValue)
                    throw new FinanceException("Only transfers can have a destination account.");
                PlanningRules.RequireCategory(records, movement.Category);
                PlanningRules.ValidateRecurringMovement(records, movement, change.Id);
                if (movement.Date.Year is < 2000 or > 2100)
                    throw new FinanceException("Invalid date.");
                if ((movement.Note?.Length ?? 0) > 200)
                    throw new FinanceException("Notes must not exceed 200 characters.");
                break;
            case "budget":
                var budget = Read<Budget>(change.Data);
                Money(budget.Limit);
                PlanningRules.RequireCategory(records, budget.Category);
                if (budget.Calendar is not ("gregory" or "persian") || (budget.Calendar == "persian" ? !SolarCalendar.ValidMonth(budget.Month) : !DateOnly.TryParseExact(budget.Month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _)))
                    throw new FinanceException("Invalid budget month.");
                if (records.Where(x => x.Kind == "budget" && !x.Deleted && x.Id != change.Id).Select(x => Read<Budget>(x.Data)).Any(x => x.Calendar == budget.Calendar && x.Month == budget.Month && x.Category == budget.Category))
                    throw new FinanceException("This category already has a budget for this month.");
                break;
            case "goal":
                var goal = Read<Goal>(change.Data);
                Text(goal.Name, 60, "Goal name");
                Money(goal.Target);
                if (goal.Saved < 0 || goal.Saved > 1_000_000_000_000 || decimal.Truncate(goal.Saved) != goal.Saved)
                    throw new FinanceException("Invalid saved amount.");
                if (goal.Deadline is not null && goal.Deadline.Value.Year is < 2000 or > 2100)
                    throw new FinanceException("Invalid goal target date.");
                break;
            case "installment":
                var installment = Read<Installment>(change.Data);
                InstallmentPaymentRules.Validate(records, installment, change.Id);
                Text(installment.Title, 80, "Installment title");
                Money(installment.Amount);
                ValidDate(installment.DueDate);
                if (installment.ReminderDays is < 0 or > 30)
                    throw new FinanceException("Reminder days must be between 0 and 30.");
                break;
            case "receivable":
                var receivable = Read<Receivable>(change.Data);
                Text(receivable.Person, 80, "Borrower name");
                Money(receivable.Amount);
                if (receivable.Returned < 0 || receivable.Returned > receivable.Amount || decimal.Truncate(receivable.Returned) != receivable.Returned)
                    throw new FinanceException("Returned amount must be between zero and the original loan.");
                ValidDate(receivable.LentOn);
                if (receivable.DueDate.HasValue)
                    ValidDate(receivable.DueDate.Value);
                if ((receivable.Note?.Length ?? 0) > 200)
                    throw new FinanceException("Notes must not exceed 200 characters.");
                break;
            case "locked":
                var locked = Read<LockedAsset>(change.Data);
                Text(locked.Name, 80, "Asset name");
                Money(locked.Amount);
                if (locked.ReleaseDate.HasValue)
                    ValidDate(locked.ReleaseDate.Value);
                if ((locked.Note?.Length ?? 0) > 200)
                    throw new FinanceException("Notes must not exceed 200 characters.");
                break;
            default:
                throw new FinanceException("Invalid record type.");
        }
    }

    private static void ValidateCardNumber(string? number)
    {
        if (!string.IsNullOrEmpty(number) && (number.Length != 16 || number.Any(c => c is < '0' or > '9')))
            throw new FinanceException("Enter a 16-digit card number.");
    }

    public static T Read<T>(JsonElement data)
    {
        try
        {
            return data.Deserialize<T>(Json) ?? throw new FinanceException("Data is required.");
        }
        catch (JsonException)
        {
            throw new FinanceException("Invalid data structure.");
        }
    }

    private static void RequireAccount(IReadOnlyList<FinanceRecord> records, Guid id)
    {
        if (!records.Any(x => x.Id == id && x.Kind == "account" && !x.Deleted))
            throw new FinanceException("The selected account does not exist.");
    }

    private static void Text(string? value, int max, string label)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > max)
            throw new FinanceException($"{label} must contain between 1 and {max} characters.");
    }

    private static void Money(decimal value)
    {
        if (value <= 0 || value > 1_000_000_000_000 || decimal.Truncate(value) != value)
            throw new FinanceException("Amount must be a positive whole-toman value, up to 1 trillion.");
    }

    private static void ValidDate(DateOnly date)
    {
        if (date.Year is < 2000 or > 2100)
            throw new FinanceException("Choose a date between 2000 and 2100.");
    }
}
