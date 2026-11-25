using System.Net;
using System.Net.Http.Json;
using DameDast.Application.Features.FinanceRecords.Models;
using System.Text.Json;
using DameDast.Common;
using DameDast.Domain;
using DameDast.Application.Services;
using Xunit;

namespace DameDast.Tests;

public sealed class KeepNotesTests
{
    private static readonly DateOnly Today = new(2026, 11, 24);
    private static Mutation Change(string kind, object value, Guid? id = null, long version = 0, bool delete = false) =>
        new(Guid.NewGuid(), id ?? Guid.NewGuid(), kind, version, delete, JsonSerializer.SerializeToElement(value, FinanceRules.Json));

    [Fact]
    public void UntitledTextAndChecklistNotesRemainValidAndMetadataSurvivesLegacyPreservation()
    {
        var item = new ChecklistItem(Guid.NewGuid(), "Task");
        var note = new PersonalNote("", "Body", false, Today, [item], Color: "sage", NoteType: "checklist",
            History: [new(Guid.NewGuid(), DateTimeOffset.UtcNow, "Before", "Old text")]);
        var record = FinanceRules.Apply([], Change("note", note));
        var payload = JsonSerializer.SerializeToElement(note with { Body = "New content", Status = "archived" }, FinanceRules.Json);
        var data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(payload.GetRawText())!;
        data.Remove("drawing"); data.Remove("whiteboardId");
        var changed = FinanceRules.Apply([record], new(Guid.NewGuid(), record.Id, "note", 1, false, JsonSerializer.SerializeToElement(data)));
        var saved = FinanceRules.Read<PersonalNote>(changed.Data);
        Assert.Equal("sage", saved.Color);
        Assert.Equal("archived", saved.Status);
        Assert.Single(saved.History!);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("note", note with { Body = "", Checklist = [] })));
        Assert.Throws<FinanceException>(() => NoteRules.Validate(note with { Checklist = [item with { Indent = 1 }] }));
    }

    [Fact]
    public void LegacyChecklistTypeAndUnrecognizedMetadataArePreserved()
    {
        var original = JsonSerializer.Deserialize<PersonalNote>("""{"title":"Legacy","body":"","pinned":false,"updatedOn":"2026-11-24","checklist":[{"id":"129a3b53-4621-40cf-9d49-0f0d93307e83","text":"Task","done":false}],"attachments":[{"name":"existing.pdf"}]}""", FinanceRules.Json)!;
        Assert.Null(original.NoteType);
        var saved = FinanceRules.Apply([], Change("note", original));
        Assert.Equal("existing.pdf", saved.Data.GetProperty("attachments")[0].GetProperty("name").GetString());
        Assert.Single(FinanceRules.Read<PersonalNote>(saved.Data).Checklist!);
    }

    [Fact]
    public void DeletingALabelRetainsNotesAndRemovesOnlyItsReference()
    {
        var label = FinanceRules.Apply([], Change("noteLabel", new NoteLabel("كتاب")));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([label], Change("noteLabel", new NoteLabel("کتاب"))));
        var note = FinanceRules.Apply([label], Change("note", new PersonalNote("", "Keep me", false, Today, Labels: [label.Id])));
        var effects = FinanceRules.ApplyWithEffects([label, note], Change("noteLabel", label.Data, label.Id, 1, true));
        Assert.True(effects.Single(x => x.Kind == "noteLabel").Deleted);
        var saved = effects.Single(x => x.Kind == "note");
        Assert.False(saved.Deleted);
        Assert.Equal("Keep me", FinanceRules.Read<PersonalNote>(saved.Data).Body);
        Assert.Empty(FinanceRules.Read<PersonalNote>(saved.Data).Labels!);
    }

    [Fact]
    public void TrashRecoveryExpiresAfterSevenDaysAndCannotExtendItsOwnDeadline()
    {
        var now = new DateTimeOffset(2026, 11, 24, 12, 0, 0, TimeSpan.Zero);
        var note = new PersonalNote("", "Text", false, Today, Status: "trashed", TrashedAt: now.AddDays(-7));
        Assert.Throws<FinanceException>(() => NoteRules.ValidateTransition(note, note with { Status = "active", TrashedAt = null }, now));
        Assert.Throws<FinanceException>(() => NoteRules.ValidateTransition(note, note with { TrashedAt = now }, now));
        NoteRules.ValidateTransition(note with { TrashedAt = now.AddDays(-6) }, note with { Status = "active", TrashedAt = null }, now);
    }

    [Fact]
    public void ArchivedNoteRemindersUseTheChosenZoneAndTrashSuppressesDelivery()
    {
        var reminder = new PersonalReminder("Title", "", Today, ["09:00"], TimeZone: "America/New_York");
        var note = FinanceRules.Apply([], Change("note", new PersonalNote("", "Text", false, Today, Status: "archived", Reminder: reminder)));
        var now = new DateTimeOffset(2026, 11, 24, 14, 1, 0, TimeSpan.Zero);
        var notification = Assert.Single(new PersonalReminderService().Notifications([note], now));
        Assert.Equal(now.AddMinutes(-1), notification.DueAt);
        Assert.Equal($"/#note/{note.Id}", notification.Url);
        var trashed = note with { Data = JsonSerializer.SerializeToElement(FinanceRules.Read<PersonalNote>(note.Data) with { Status = "trashed", TrashedAt = now }, FinanceRules.Json) };
        Assert.Empty(new PersonalReminderService().Notifications([trashed], now));
        Assert.Throws<FinanceException>(() => OrganizerRules.Validate(reminder with { TimeZone = "Unknown/Zone" }));
    }

    [Fact]
    public async Task SyncRoundTripsHistoryLabelsAndArchiveAndRejectsExpiredRestorationAtomically()
    {
        await using var app = new FinanceTests.TestApp();
        using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-User", "keep-notes-user");
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
        var label = Change("noteLabel", new NoteLabel("Personal"));
        var content = new PersonalNote("", "Current text", true, Today, Labels: [label.Id],
            History: [new(Guid.NewGuid(), DateTimeOffset.UtcNow, "", "Previous text")]);
        var note = Change("note", content);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([label, note]))).StatusCode);
        var archived = Change("note", content with { Status = "archived" }, note.Id, 1);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([archived]))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([Change("note", content, note.Id, 1)]))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([Change("noteLabel", label.Data, label.Id, 1, true)]))).StatusCode);
        var saved = (await client.GetFromJsonAsync<Snapshot>("/api/finance"))!.Records.Single(r => r.Id == note.Id);
        var data = FinanceRules.Read<PersonalNote>(saved.Data);
        Assert.Equal("archived", data.Status);
        Assert.Equal("Current text", data.Body);
        Assert.Equal("Previous text", Assert.Single(data.History!).Body);
        Assert.Empty(data.Labels!);
        var trashed = data with { Status = "trashed", TrashedAt = DateTimeOffset.UtcNow.AddDays(-8) };
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([Change("note", trashed, note.Id, saved.Version)]))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([Change("note", data, note.Id, saved.Version + 1)]))).StatusCode);
        Assert.Equal("trashed", FinanceRules.Read<PersonalNote>((await client.GetFromJsonAsync<Snapshot>("/api/finance"))!.Records.Single(r => r.Id == note.Id).Data).Status);
    }

    [Fact]
    public void DstGapUsesFirstValidMinuteAndAmbiguityUsesLaterOccurrence()
    {
        Assert.Equal(new DateTimeOffset(2026, 3, 8, 7, 0, 0, TimeSpan.Zero), Time.At(new(2026, 3, 8), new(2, 30), "America/New_York"));
        Assert.Equal(new DateTimeOffset(2026, 11, 1, 6, 30, 0, TimeSpan.Zero), Time.At(new(2026, 11, 1), new(1, 30), "America/New_York"));
    }
}
