using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Domain;
using Xunit;

namespace DameDast.Tests;

public sealed class CalendarTests
{
    private static CalendarEntry Entry() => new("جلسه / Meeting", "", new(2026, 11, 16), new(2026, 11, 16));

    [Fact]
    public void CalendarRulesRejectInvalidRangesTimesAndCompletionDates()
    {
        var entry = Entry();
        CalendarRules.Validate(entry with { AllDay = false, StartTime = "09:00", EndTime = "10:00", Repeat = "monthly" });
        foreach (var invalid in new[]
        {
            entry with { EndDate = entry.StartDate.AddDays(-1) },
            entry with { EndDate = entry.StartDate.AddDays(32) },
            entry with { AllDay = false, StartTime = "10:00", EndTime = "09:00" },
            entry with { RepeatUntil = entry.StartDate.AddDays(-1) },
            entry with { Color = "url(bad)" },
            entry with { RepeatCalendar = "unknown" },
            entry with { CompletedDates = [entry.StartDate, entry.StartDate] }
        }) Assert.Throws<FinanceException>(() => CalendarRules.Validate(invalid));
    }

    [Fact]
    public void ChecklistSchedulingSurvivesSerializationAndRejectsIncompleteTimes()
    {
        var task = new ChecklistItem(Guid.NewGuid(), "پرداخت", DueDate: new(2026, 11, 16), DueTime: "09:30");
        var note = new PersonalNote("Note", "", false, new(2026, 11, 16), [task]);
        ValidateNote(note);
        var read = JsonSerializer.Deserialize<PersonalNote>(JsonSerializer.Serialize(note, FinanceRules.Json), FinanceRules.Json)!;
        Assert.Equal(task, Assert.Single(read.Checklist!));
        Assert.Throws<FinanceException>(() => ValidateNote(note with { Checklist = [task with { DueDate = null }] }));
        Assert.Throws<FinanceException>(() => ValidateNote(note with { Checklist = [task with { DueTime = "25:00" }] }));
    }

    private static void ValidateNote(PersonalNote note) => FinanceRules.Apply([], new Mutation(Guid.NewGuid(), Guid.NewGuid(), "note", 0, false, JsonSerializer.SerializeToElement(note, FinanceRules.Json)));

    [Fact]
    public async Task CalendarSyncUsesExistingRevisionChecksAndPerUserStorage()
    {
        await using var app = new FinanceTests.TestApp();
        using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session", CancellationToken.None);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
        var change = new Mutation(Guid.NewGuid(), Guid.NewGuid(), "calendarEvent", 0, false, JsonSerializer.SerializeToElement(Entry(), FinanceRules.Json));
        var response = await client.PostAsJsonAsync("/api/sync", new SyncRequest([change]), CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadAsStringAsync(CancellationToken.None);
        Assert.Contains("calendarEvent", result);
        client.DefaultRequestHeaders.Remove("X-Test-User");
        client.DefaultRequestHeaders.Add("X-Test-User", "bob");
        Assert.DoesNotContain("calendarEvent", await client.GetStringAsync("/api/finance", CancellationToken.None));
    }
}
