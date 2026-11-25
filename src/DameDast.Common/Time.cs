namespace DameDast.Common;

public static class Time
{
    public static DateTimeOffset UtcNow(this TimeProvider provider) => provider.GetUtcNow();
    public static DateTimeOffset ToTehran(DateTimeOffset instant) =>
        TimeZoneInfo.ConvertTime(instant, TimeZoneInfo.FindSystemTimeZoneById("Asia/Tehran"));

    public static DateTimeOffset InTimeZone(DateTimeOffset instant, string timeZone) =>
        TimeZoneInfo.ConvertTime(instant, TimeZoneInfo.FindSystemTimeZoneById(timeZone));

    public static DateTimeOffset TehranAt(DateOnly day, TimeOnly time) => At(day, time, "Asia/Tehran");

    public static DateTimeOffset At(DateOnly day, TimeOnly time, string timeZone)
    {
        var local = DateTime.SpecifyKind(day.ToDateTime(time), DateTimeKind.Unspecified);
        var zone = TimeZoneInfo.FindSystemTimeZoneById(timeZone);
        // A skipped DST time is delivered at the first valid local minute.
        while (zone.IsInvalidTime(local)) local = local.AddMinutes(1);
        var offset = zone.IsAmbiguousTime(local) ? zone.GetAmbiguousTimeOffsets(local).Min() : zone.GetUtcOffset(local);
        return new DateTimeOffset(local, offset);
    }

    public static DateTimeOffset TehranNow(this TimeProvider provider) => TimeZoneInfo.ConvertTime(provider.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById("Asia/Tehran"));
    public static DateOnly TehranToday(this TimeProvider provider) => DateOnly.FromDateTime(provider.TehranNow().DateTime);
}
