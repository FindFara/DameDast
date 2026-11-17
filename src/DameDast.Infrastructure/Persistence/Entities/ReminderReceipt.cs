namespace DameDast.Infrastructure;

public sealed class ReminderReceipt
{
    public string Key { get; set; } = "";
    public DateTimeOffset SentAt { get; set; }
}
