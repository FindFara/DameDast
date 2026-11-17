using System.Globalization;
using Poolo.Common;

namespace Poolo.Domain;

public static class PlanningRules
{
    public static readonly string[] Colors = ["#75b29a", "#dabf83", "#829bc9", "#bb94c8", "#db9a81", "#8fb6bc", "#a9ba7c", "#b5a59d", "#b8cbbd", "#91a6bc", "#cfb1b6", "#95b3a4"];
    public static bool ValidCategory(IReadOnlyList<FinanceRecord> records, string? category) => category is not null && (FinanceRules.Categories.Contains(category) || category is "Investment" or "Savings" || category.StartsWith("custom:", StringComparison.Ordinal) && Guid.TryParse(category.AsSpan(7), out var id) && records.Any(r =>
        r.Id == id && r.Kind == "category" && !r.Deleted));
    public static void RequireCategory(IReadOnlyList<FinanceRecord> records, string category)
    {
        if (!ValidCategory(records, category))
            throw new FinanceException("Invalid category.");
    }

    public static bool ReferencesCategory(FinanceRecord r, string category) => !r.Deleted && (r.Kind switch
    {
        "transaction" => FinanceRules.Read<Movement>(r.Data).Category == category,
        "budget" => FinanceRules.Read<Budget>(r.Data).Category == category,
        "monthlyExpense" => FinanceRules.Read<MonthlyExpense>(r.Data).Category == category,
        "allocationPlan" => FinanceRules.Read<AllocationPlan>(r.Data).Rows.Any(x => x.Category == category),
        _ => false
    });
    public static bool TryValidate(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        switch (change.Kind)
        {
            case "category":
                var category = FinanceRules.Read<FinanceCategory>(change.Data);
                Text(category.Name, 50);
                if (!Colors.Contains(category.Color))
                    throw new FinanceException("Invalid category color.");
                if (FinanceRules.Categories.Concat(["Investment", "Savings"]).Contains(category.Name, StringComparer.OrdinalIgnoreCase) || records.Where(r => r.Kind == "category" && !r.Deleted && r.Id != change.Id).Any(r => FinanceRules.Read<FinanceCategory>(r.Data).Name.Equals(category.Name, StringComparison.OrdinalIgnoreCase)))
                    throw new FinanceException("This category name already exists.");
                break;
            case "note":
                var note = FinanceRules.Read<PersonalNote>(change.Data);
                Text(note.Title, 80);
                if (note.Body is null || note.Body.Length > 4000)
                    throw new FinanceException("Notes must not exceed 4000 characters.");
                Date(note.UpdatedOn);
                break;
            case "monthlyExpense":
                var expense = FinanceRules.Read<MonthlyExpense>(change.Data);
                Text(expense.Title, 80);
                Money(expense.Amount);
                RequireCategory(records, expense.Category);
                if (expense.Day is < 1 or > 31 || !SolarCalendar.ValidMonth(expense.StartMonth) || expense.EndMonth is not null && (!SolarCalendar.ValidMonth(expense.EndMonth) || string.CompareOrdinal(expense.EndMonth, expense.StartMonth) < 0))
                    throw new FinanceException("Invalid recurring expense schedule.");
                if (expense.AccountId is not null && !records.Any(r => r.Id == expense.AccountId && r.Kind == "account" && !r.Deleted))
                    throw new FinanceException("The selected account does not exist.");
                break;
            case "allocationPlan":
                var plan = FinanceRules.Read<AllocationPlan>(change.Data);
                Money(plan.Total);
                if (!SolarCalendar.ValidMonth(plan.Month) || plan.Rows is null || plan.Rows.Count is < 1 or > 30 || plan.Rows.Any(r => r is null || r.BasisPoints is < 0 or > 10000) || plan.Rows.Sum(r => r.BasisPoints) > 10000)
                    throw new FinanceException("Percentages must total 100% or less.");
                if (plan.Rows.Select(r => r.Category).Distinct().Count() != plan.Rows.Count)
                    throw new FinanceException("Each category can appear only once.");
                foreach (var row in plan.Rows)
                    RequireCategory(records, row.Category);
                if (records.Where(r => r.Kind == "allocationPlan" && !r.Deleted && r.Id != change.Id).Any(r => FinanceRules.Read<AllocationPlan>(r.Data).Month == plan.Month))
                    throw new FinanceException("This month already has a plan.");
                break;
            case "investmentStep":
                var step = FinanceRules.Read<InvestmentStep>(change.Data);
                Text(step.Title, 80);
                Money(step.Amount);
                Date(step.Date);
                if (step.ActualValue is < 0 or > 1_000_000_000_000 || step.ActualValue.HasValue && decimal.Truncate(step.ActualValue.Value) != step.ActualValue)
                    throw new FinanceException("Invalid current investment value.");
                if (step.ActualValue.HasValue != step.ValueDate.HasValue || step.ValueDate < step.Date)
                    throw new FinanceException("Choose a valuation date on or after the investment.");
                if (step.ValueDate.HasValue)
                    Date(step.ValueDate.Value);
                break;
            case "benchmarkSeries":
                var series = FinanceRules.Read<BenchmarkSeries>(change.Data);
                Text(series.Source, 80);
                if (series.Symbol is not ("GOLD" or "USD" or "BTC" or "FUND") || series.Year is < 2000 or > 2100 || series.Points is null || series.Points.Count is < 1 or > 366 || series.Points.Any(p => p is null || p.Date.Year != series.Year || p.Price <= 0 || p.Price > 1_000_000_000_000_000) || series.Points.Select(p => p.Date).Distinct().Count() != series.Points.Count)
                    throw new FinanceException("Invalid benchmark history.");
                foreach (var point in series.Points)
                    if (point.Source is not null)
                        Text(point.Source, 80);
                if (records.Where(r => r.Kind == "benchmarkSeries" && !r.Deleted && r.Id != change.Id).Any(r =>
                {
                    var s = FinanceRules.Read<BenchmarkSeries>(r.Data);
                    return s.Symbol == series.Symbol && s.Year == series.Year;
                }))
                    throw new FinanceException("This price history already exists.");
                break;
            default:
                return false;
        }

        return true;
    }

    public static void ValidateRecurringMovement(IReadOnlyList<FinanceRecord> records, Movement movement, Guid id)
    {
        if (movement.RecurringExpenseId is null && movement.RecurringMonth is null)
            return;
        if (movement.Type != "expense" || movement.RecurringExpenseId is null || !SolarCalendar.ValidMonth(movement.RecurringMonth) || movement.Date.MonthKey() != movement.RecurringMonth || !records.Any(r => r.Id == movement.RecurringExpenseId && r.Kind == "monthlyExpense"))
            throw new FinanceException("Invalid recurring expense payment.");
        if (records.Where(r => r.Kind == "transaction" && !r.Deleted && r.Id != id).Select(r => FinanceRules.Read<Movement>(r.Data)).Any(t => t.RecurringExpenseId == movement.RecurringExpenseId && t.RecurringMonth == movement.RecurringMonth))
            throw new FinanceException("This monthly expense is already recorded.");
    }

    private static void Text(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > max || value != value.Trim())
            throw new FinanceException("Enter a valid title or name.");
    }

    private static void Money(decimal value)
    {
        if (value <= 0 || value > 1_000_000_000_000 || decimal.Truncate(value) != value)
            throw new FinanceException("Enter a valid amount.");
    }

    private static void Date(DateOnly value)
    {
        if (value.Year is < 2000 or > 2100)
            throw new FinanceException("Invalid date.");
    }
}
