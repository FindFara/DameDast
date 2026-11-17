using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Application.Features.Organizer.Models;
using DameDast.Application.Services;
using DameDast.Common;
using DameDast.Domain;
using Xunit;

namespace DameDast.Tests;

public sealed class OrganizerTests
{
    private static readonly DateOnly Start = new(2026, 11, 16);
    private static readonly DateTimeOffset Now = new(2026, 11, 16, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void LegacyNotesAndGoalsRetainTheirDefaults()
    {
        var note = JsonSerializer.Deserialize<PersonalNote>("""{"title":"Legacy","body":"Old content","pinned":true,"updatedOn":"2026-11-16"}""", FinanceRules.Json)!;
        var goal = JsonSerializer.Deserialize<Goal>("""{"name":"Trip","target":100,"saved":20,"deadline":null,"color":"teal"}""", FinanceRules.Json)!;
        Assert.Null(note.Checklist);
        Assert.True(note.Pinned);
        Assert.False(goal.Pinned);
        Assert.Equal(20, goal.Saved);
    }

    [Fact]
    public void ChecklistRequiresDistinctTaskIdsAndBoundedNonEmptyText()
    {
        var task = new ChecklistItem(Guid.NewGuid(), "Pay rent");
        var note = new PersonalNote("Home", "", false, Start, [task]);
        var record = FinanceRules.Apply([], Change("note", note));
        Assert.Single(FinanceRules.Read<PersonalNote>(record.Data).Checklist!);
        foreach (var tasks in new[] { new[] { task, task }, new[] { task with { Id = Guid.Empty } }, new[] { task with { Text = " " } }, new[] { task with { Text = new string('x', 201) } } })
            Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("note", note with { Checklist = tasks })));
    }

    [Fact]
    public void EachReminderTimeHasItsOwnCountAndTehranOccurrenceIdentity()
    {
        var reminder = Reminder();
        var first = Assert.Single(OrganizerRules.DueOccurrences(reminder, Now));
        Assert.Equal("2026-11-16T09:00", first.Occurrence);
        Assert.Equal(new DateTimeOffset(2026, 11, 16, 5, 30, 0, TimeSpan.Zero), first.DueAt);
        var later = OrganizerRules.DueOccurrences(reminder with { MaxOccurrences = 2 }, Now.AddDays(1));
        Assert.Equal(2, later.Count);
        Assert.All(later, value => Assert.StartsWith("2026-11-16", value.Occurrence));
        Assert.Empty(OrganizerRules.DueOccurrences(reminder with { Completed = true }, Now));
        Assert.Empty(OrganizerRules.DueOccurrences(reminder with { StartDate = Start.AddDays(1) }, Now));
    }

    [Fact]
    public void MonthlyReminderUsesPersianMonthsAndClampsFromTheOriginalDate()
    {
        var start = SolarCalendar.DayOfMonth("1405-06", 31);
        var first = SolarCalendar.DayOfMonth("1405-07", 30);
        var second = SolarCalendar.DayOfMonth("1405-08", 30);
        var reminder = Reminder() with { StartDate = start, Repeat = "monthly", Times = ["09:00"] };
        Assert.Single(OrganizerRules.DueOccurrences(reminder, Time.TehranAt(first, new TimeOnly(10, 0))));
        Assert.Single(OrganizerRules.DueOccurrences(reminder, Time.TehranAt(second, new TimeOnly(10, 0))));
        Assert.Empty(OrganizerRules.DueOccurrences(reminder with { EndDate = first }, Time.TehranAt(second, new TimeOnly(10, 0))));
        Assert.Throws<FinanceException>(() => OrganizerRules.Validate(reminder with { Interval = 13 }));
    }

    [Fact]
    public void ReadReceiptBelongsToAnExistingSourceAndDoesNotSuppressLaterOccurrences()
    {
        var record = FinanceRules.Apply([], Change("reminder", Reminder()));
        var service = new PersonalReminderService();
        var first = Assert.Single(service.Notifications([record], Now));
        var read = FinanceRules.Apply([record], Change("notificationRead", new NotificationRead(record.Id, first.Occurrence)));
        Assert.True(Assert.Single(service.Notifications([record, read], Now)).Read);
        Assert.Single(service.Notifications([record, read], Now.AddHours(7)), x => !x.Read);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([record], Change("notificationRead", new NotificationRead(Guid.NewGuid(), first.Occurrence))));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([record], Change("notificationRead", new NotificationRead(record.Id, first.Occurrence, "not-an-import"))));
    }

    [Fact]
    public async Task OrganizerControllerCombinesServicesAndKeepsPerUserIsolationAndCsrf()
    {
        await using var app = new FinanceTests.TestApp(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(new FixedClock());
        });
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/organizer", CancellationToken.None)).StatusCode);
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        var note = Change("note", new PersonalNote("Home", "", true, Start, [new(Guid.NewGuid(), "Check budget")]));
        var reminder = Change("reminder", Reminder());
        var goal = Change("goal", new Goal("Trip", 100, 20, null, true));
        var request = new SyncRequest([note, reminder, goal]);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/sync", request, CancellationToken.None)).StatusCode);
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session", CancellationToken.None);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/sync", request, CancellationToken.None)).StatusCode);
        var organizer = await client.GetFromJsonAsync<OrganizerOverview>("/api/organizer", CancellationToken.None);
        Assert.Equal(3, organizer!.Pinned.Count);
        Assert.Equal(1, organizer.OpenTasks);
        Assert.Equal(Now, organizer.Now);
        Assert.Single(organizer.Notifications);
        client.DefaultRequestHeaders.Remove("X-Test-User");
        client.DefaultRequestHeaders.Add("X-Test-User", "bob");
        var other = await client.GetFromJsonAsync<OrganizerOverview>("/api/organizer", CancellationToken.None);
        Assert.Empty(other!.Pinned);
        Assert.Empty(other.Notifications);
    }

    private static PersonalReminder Reminder() => new("Review money", "Private reminder body", Start, ["09:00", "18:00"], "daily", Pinned: true);
    private static Mutation Change(string kind, object data) => new(Guid.NewGuid(), Guid.NewGuid(), kind, 0, false, JsonSerializer.SerializeToElement(data, FinanceRules.Json));
    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
