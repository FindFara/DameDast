using System.Globalization;

namespace DameDast.Common;

public static class SolarCalendar
{
    private static readonly PersianCalendar Calendar = new();
    public static int MonthDistance(DateOnly from, DateOnly to)
    {
        var start = from.ToDateTime(TimeOnly.MinValue);
        var end = to.ToDateTime(TimeOnly.MinValue);
        return (Calendar.GetYear(end) - Calendar.GetYear(start)) * 12 + Calendar.GetMonth(end) - Calendar.GetMonth(start);
    }

    public static DateOnly AddMonths(DateOnly day, int count) =>
        DateOnly.FromDateTime(Calendar.AddMonths(day.ToDateTime(TimeOnly.MinValue), count));

    public static string MonthKey(this DateOnly date)
    {
        var day = date.ToDateTime(TimeOnly.MinValue);
        return $"{Calendar.GetYear(day):0000}-{Calendar.GetMonth(day):00}";
    }

    public static bool ValidMonth(string? value)
    {
        if (value is null || value.Length != 7 || value[4] != '-' || !int.TryParse(value.AsSpan(0, 4), out var year) || !int.TryParse(value.AsSpan(5, 2), out var month) || year is < 1378 or > 1479 || month is < 1 or > 12)
            return false;
        return value == $"{year:0000}-{month:00}";
    }

    public static DateOnly DayOfMonth(string value, int day)
    {
        if (!ValidMonth(value))
            throw new ArgumentException("Invalid Persian month.", nameof(value));
        var year = int.Parse(value.AsSpan(0, 4), CultureInfo.InvariantCulture);
        var month = int.Parse(value.AsSpan(5, 2), CultureInfo.InvariantCulture);
        return DateOnly.FromDateTime(Calendar.ToDateTime(year, month, Math.Clamp(day, 1, Calendar.GetDaysInMonth(year, month)), 0, 0, 0, 0));
    }
}
