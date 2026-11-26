namespace DameDast.Domain;
public sealed record WorkoutProgram(string Title, string Body);
public sealed record WeightMeasurement(DateOnly Date, decimal Kg);
public static class ExerciseRules
{
    public static bool TryValidate(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        if (change.Kind == "workoutProgram")
        {
            var program = FinanceRules.Read<WorkoutProgram>(change.Data);
            if (string.IsNullOrWhiteSpace(program.Title) || program.Title.Length > 120 || string.IsNullOrWhiteSpace(program.Body) || program.Body.Length > 20000)
                throw new FinanceException("Enter a program title and notes under 20000 characters.");
            return true;
        }
        if (change.Kind is not ("weightEntry" or "weightGoal")) return false;
        var weight = FinanceRules.Read<WeightMeasurement>(change.Data);
        if (weight.Date.Year is < 2000 or > 2100 || weight.Kg is <= 0 or > 500 || weight.Kg * 10 != decimal.Truncate(weight.Kg * 10))
            throw new FinanceException("Enter a valid date and weight from 0.1 to 500 kg.");
        if (records.Any(r => !r.Deleted && r.Kind == change.Kind && r.Id != change.Id && (change.Kind == "weightGoal" || FinanceRules.Read<WeightMeasurement>(r.Data).Date == weight.Date)))
            throw new FinanceException("This date already has a weight entry or goal. Edit it instead.");
        return true;
    }
}
