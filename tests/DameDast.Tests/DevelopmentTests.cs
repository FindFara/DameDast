using System.Text.Json;
using DameDast.Domain;
using Xunit;

namespace DameDast.Tests;
public sealed class DevelopmentTests
{
    private static Mutation Change(string kind, object data, Guid? id = null, long version = 0) => new(Guid.NewGuid(), id ?? Guid.NewGuid(), kind, version, false, JsonSerializer.SerializeToElement(data, FinanceRules.Json));
    [Fact]
    public void ActivitiesAndWorkoutNotesPersistWithVersionProtection()
    {
        var data = new DevelopmentEntry(new(2026,11,28), "study", "System design", 45, "Chapter one", false);
        var saved = FinanceRules.Apply([], Change("developmentEntry", data));
        Assert.Equal(data, FinanceRules.Read<DevelopmentEntry>(saved.Data));
        var done = FinanceRules.Apply([saved], Change(saved.Kind, data with { Done = true }, saved.Id, saved.Version));
        Assert.True(FinanceRules.Read<DevelopmentEntry>(done.Data).Done);
        Assert.Throws<ConflictException>(() => FinanceRules.Apply([done], Change(saved.Kind, data, saved.Id, saved.Version)));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("developmentEntry", data with { Minutes = 1441 })));
        var program = new WorkoutProgram("Day A", "## Chest\n- Bench press 3×10");
        Assert.Equal(program, FinanceRules.Read<WorkoutProgram>(FinanceRules.Apply([], Change("workoutProgram", program)).Data));
    }
    [Fact]
    public void LessonPlansRequireTheImportedLessonAndWeightsAreUniquePerDay()
    {
        var lesson = FinanceRules.Apply([], Change("languageLesson", new LanguageLesson("Grammar", "# Grammar", "grammar.md")));
        var plan = new DevelopmentEntry(new(2026,11,28), "lesson", "Grammar", 20, "", false, lesson.Id);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("developmentEntry", plan)));
        Assert.Equal(lesson.Id, FinanceRules.Read<DevelopmentEntry>(FinanceRules.Apply([lesson], Change("developmentEntry", plan)).Data).ResourceId);
        var weight = new WeightMeasurement(new(2026,11,26),68.5m);
        var saved = FinanceRules.Apply([], Change("weightEntry", weight));
        Assert.Equal(68.5m, FinanceRules.Read<WeightMeasurement>(saved.Data).Kg);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([saved], Change("weightEntry", weight)));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("weightEntry", weight with { Kg=68.55m })));
        var goal=FinanceRules.Apply([], Change("weightGoal", weight with { Kg=72m }));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([goal], Change("weightGoal", weight)));
    }
}
