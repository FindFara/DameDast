namespace Poolo.Common;

public static class Time
{
    public static DateTimeOffset UtcNow(this TimeProvider provider) => provider.GetUtcNow();
    public static DateTimeOffset ToTehran(DateTimeOffset instant) =>
        TimeZoneInfo.ConvertTime(instant, TimeZoneInfo.FindSystemTimeZoneById("Asia/Tehran"));

    public static DateTimeOffset TehranAt(DateOnly day, TimeOnly time)
    {
        var local = DateTime.SpecifyKind(day.ToDateTime(time), DateTimeKind.Unspecified);
        return new DateTimeOffset(local, TimeZoneInfo.FindSystemTimeZoneById("Asia/Tehran").GetUtcOffset(local));
    }

    public static DateTimeOffset TehranNow(this TimeProvider provider) => TimeZoneInfo.ConvertTime(provider.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById("Asia/Tehran"));
    public static DateOnly TehranToday(this TimeProvider provider) => DateOnly.FromDateTime(provider.TehranNow().DateTime);
}
