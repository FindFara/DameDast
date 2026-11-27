using System.Text.Json;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Market;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Application.Features.Reminders.Models;
using DameDast.Application.Services;
using DameDast.Domain;
using Xunit;

namespace DameDast.Tests;

public sealed class ReminderServiceTests
{
    [Theory]
    [InlineData(PushDeliveryResult.Delivered, 1, 1, 0)]
    [InlineData(PushDeliveryResult.Expired, 1, 0, 1)]
    [InlineData(PushDeliveryResult.RetryLater, 2, 0, 0)]
    public async Task ReminderPassPreservesDailyDeduplicationExpiryAndRetry(PushDeliveryResult delivery, int expectedSends, int expectedReceipts, int expectedRemovals)
    {
        var device = new PushDevice("device", "alice", "https://fcm.googleapis.com/test", "key", "auth", "fa");
        var subscriptions = new SubscriptionRepository(device);
        var receipts = new ReceiptRepository();
        var gateway = new RecordingGateway(delivery);
        var service = new ReminderService(new FinanceRepository(), subscriptions, receipts, gateway, new Clock(), new PersonalReminderService());
        await service.SendDueAsync(CancellationToken.None);
        await service.SendDueAsync(CancellationToken.None);
        Assert.Equal(expectedSends, gateway.Sends);
        Assert.Equal(expectedReceipts, receipts.Count);
        Assert.Equal(expectedRemovals, subscriptions.Removals);
        Assert.Equal("fa", gateway.Message!.Lang);
        Assert.Equal("/#installments", gateway.Message.Url);
        Assert.DoesNotContain("Private loan", gateway.Message.Body);
        Assert.DoesNotContain("12345", gateway.Message.Body);
    }

    [Fact]
    public async Task RepeatingPersonalReminderDeduplicatesEachTimeWithoutSuppressingTheNextDay()
    {
        var device = new PushDevice("device", "alice", "https://fcm.googleapis.com/test", "key", "auth", "en");
        var reminder = new PersonalReminder("Private title", "Private body", new DateOnly(2026, 11, 16),
            ["09:00", "10:00"], "daily", MaxOccurrences: 3);
        var record = new FinanceRecord(Guid.NewGuid(), "reminder", 1, false, JsonSerializer.SerializeToElement(reminder, FinanceRules.Json));
        var receipts = new ReceiptRepository();
        var gateway = new RecordingGateway(PushDeliveryResult.Delivered);
        var clock = new MutableClock();
        var service = new ReminderService(new FinanceRepository([record]), new SubscriptionRepository(device),
            receipts, gateway, clock, new PersonalReminderService());
        await service.SendDueAsync(CancellationToken.None);
        await service.SendDueAsync(CancellationToken.None);
        Assert.Equal(2, gateway.Sends);
        Assert.Equal(2, receipts.Count);
        clock.Now = clock.Now.AddDays(1);
        await service.SendDueAsync(CancellationToken.None);
        Assert.Equal(3, gateway.Sends);
        Assert.Equal(3, receipts.Count);
        Assert.Equal("/#reminders", gateway.Message!.Url);
        Assert.DoesNotContain("Private", gateway.Message.Body);
    }

    [Theory]
    [InlineData(false, false, 0)]
    [InlineData(false, true, 1)]
    [InlineData(true, false, 1)]
    [InlineData(true, true, 2)]
    public async Task DeviceCategoryPreferencesControlDeliveriesAndReceipts(bool reminders, bool installments, int expected)
    {
        var device = new PushDevice("device", "alice", "https://fcm.googleapis.com/test", "key", "auth", "en", reminders, installments);
        var reminder = new PersonalReminder("Title", "Body", new DateOnly(2026, 11, 16), ["09:00"], "once");
        var records = new[] {
            new FinanceRecord(Guid.NewGuid(), "reminder", 1, false, JsonSerializer.SerializeToElement(reminder, FinanceRules.Json)),
            new FinanceRecord(Guid.NewGuid(), "installment", 1, false, JsonSerializer.SerializeToElement(new Installment("Loan", 100, new DateOnly(2026, 11, 16), false, 3), FinanceRules.Json))
        };
        var gateway = new RecordingGateway(PushDeliveryResult.Delivered);
        var receipts = new ReceiptRepository();
        var service = new ReminderService(new FinanceRepository(records), new SubscriptionRepository(device), receipts, gateway, new Clock(), new PersonalReminderService());
        await service.SendDueAsync(CancellationToken.None);
        Assert.Equal(expected, gateway.Sends);
        Assert.Equal(expected, receipts.Count);
    }

    private sealed class MutableClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 11, 16, 8, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2026, 11, 16, 8, 0, 0, TimeSpan.Zero);
    }

    private sealed class FinanceRepository(IReadOnlyList<FinanceRecord>? records = null) : IFinanceRepository
    {
        public Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken) => Task.FromResult(new Snapshot(1, records ?? [new FinanceRecord(Guid.NewGuid(), "installment", 1, false, JsonSerializer.SerializeToElement(new Installment("Private loan", 12345, new DateOnly(2026, 11, 16), false, 3), FinanceRules.Json))]));
        public Task<Snapshot> ApplyAsync(string userId, IReadOnlyList<Mutation> changes, CancellationToken cancellationToken) =>
            throw new NotSupportedException();
    }

    private sealed class SubscriptionRepository(PushDevice device) : IPushSubscriptionRepository
    {
        public int Removals { get; private set; }

        public Task<IReadOnlyList<PushDevice>> ReadAllAsync(CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<PushDevice>>(Removals == 0 ? [device] : []);
        public Task RemoveAsync(string userId, string endpoint, CancellationToken cancellationToken)
        {
            Assert.Equal(device.UserId, userId);
            Assert.Equal(device.Endpoint, endpoint);
            Removals++;
            return Task.CompletedTask;
        }

        public Task UpsertAsync(string userId, PushRegistration registration, CancellationToken cancellationToken) => throw new NotSupportedException();
    }

    private sealed class ReceiptRepository : IReminderReceiptRepository
    {
        private readonly HashSet<string> keys = [];
        public int Count => keys.Count;

        public Task<bool> ExistsAsync(string key, CancellationToken cancellationToken) => Task.FromResult(keys.Contains(key));
        public Task RecordAsync(string key, DateTimeOffset sentAt, CancellationToken cancellationToken)
        {
            keys.Add(key);
            return Task.CompletedTask;
        }
    }

    private sealed class RecordingGateway(PushDeliveryResult result) : IPushGateway
    {
        public int Sends { get; private set; }
        public PushMessage? Message { get; private set; }
        public PushConfiguration Configuration => new(true, "test");

        public Task InitializeAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<PushDeliveryResult> SendAsync(PushDevice device, PushMessage message, CancellationToken cancellationToken)
        {
            Sends++;
            Message = message;
            return Task.FromResult(result);
        }
    }
}
