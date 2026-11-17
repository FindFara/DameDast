using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Market;
using Poolo.Application.Interfaces.Reminders;
using Poolo.Application.Features.Reminders.Models;
using Poolo.Common;
using Poolo.Domain;

namespace Poolo.Application.Services;

public sealed class ReminderService(IFinanceRepository finance, IPushSubscriptionRepository subscriptions, IReminderReceiptRepository receipts, IPushGateway gateway, TimeProvider clock, IPersonalReminderService personal) : IReminderService
{
    public async Task SendDueAsync(CancellationToken cancellationToken)
    {
        if (!gateway.Configuration.Configured)
            return;
        var today = clock.TehranToday();
        foreach (var device in await subscriptions.ReadAllAsync(cancellationToken))
        {
            var snapshot = await finance.ReadAsync(device.UserId, cancellationToken);
            if (!await SendPersonalAsync(device, snapshot.Records, cancellationToken)) continue;
            if (clock.TehranNow().Hour is < 9 or >= 21) continue;
            var manualDue = snapshot.Records.Where(x => !x.Deleted && x.Kind == "installment").Select(x => FinanceRules.Read<Installment>(x.Data)).Any(x => InstallmentReminderRules.IsDue(x, today));
            if (!manualDue && !InstallmentReminderRules.HasImportedDue(snapshot.Records, today))
                continue;
            var receiptKey = $"{device.Id}:{today:yyyy-MM-dd}";
            if (await receipts.ExistsAsync(receiptKey, cancellationToken))
                continue;
            var result = await gateway.SendAsync(device, CreateMessage(device.Language, manualDue), cancellationToken);
            if (result == PushDeliveryResult.Delivered)
                await receipts.RecordAsync(receiptKey, clock.UtcNow(), cancellationToken);
            else if (result == PushDeliveryResult.Expired)
                await subscriptions.RemoveAsync(device.UserId, device.Endpoint, cancellationToken);
        }
    }

    private async Task<bool> SendPersonalAsync(PushDevice device, IReadOnlyList<FinanceRecord> records, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow();
        var alerts = personal.Notifications(records, now)
            .Where(x => x.Kind == "reminder" && !x.Read && now - x.DueAt < TimeSpan.FromDays(1)).Take(12);
        foreach (var alert in alerts)
        {
            var key = $"{device.Id}:personal:{alert.SourceId}:{alert.Occurrence}";
            if (await receipts.ExistsAsync(key, cancellationToken)) continue;
            var persian = device.Language == "fa";
            var message = new PushMessage(persian ? "دمِ دست · یادآوری" : "Damdast · Reminder",
                persian ? "یک یادآور برای بررسی داری." : "You have a reminder to review.",
                device.Language, persian ? "rtl" : "ltr", "/#reminders", "damdast-personal-" + alert.SourceId);
            var result = await gateway.SendAsync(device, message, cancellationToken);
            if (result == PushDeliveryResult.Delivered) await receipts.RecordAsync(key, clock.UtcNow(), cancellationToken);
            else if (result == PushDeliveryResult.Expired)
            {
                await subscriptions.RemoveAsync(device.UserId, device.Endpoint, cancellationToken);
                return false;
            }
        }
        return true;
    }

    private static PushMessage CreateMessage(string language, bool manualDue)
    {
        var persian = language == "fa";
        return new(persian ? "دمِ دست · یادآوری قسط" : "Damdast · Installment reminder", persian ? "قسطی به سررسید رسیده یا نیاز به بررسی دارد." : "An installment is due or needs attention.", language, persian ? "rtl" : "ltr", manualDue ? "/#installments" : "/#connected", "poolo-installments");
    }
}
