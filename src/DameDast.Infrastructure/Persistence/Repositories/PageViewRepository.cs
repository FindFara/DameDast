using DameDast.Application.Features.Administration;
using DameDast.Application.Interfaces.Administration;
using Microsoft.EntityFrameworkCore;

namespace DameDast.Infrastructure.Persistence.Repositories;

public sealed class PageViewRepository(IDbContextFactory<FinanceDb> factory) : IPageViewRepository
{
    public async Task IncrementAsync(string page, DateOnly date, long count, CancellationToken ct)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "PageViews" ("Page", "Date", "Views") VALUES ({page}, {date}, {count})
            ON CONFLICT ("Page", "Date") DO UPDATE SET "Views" = "PageViews"."Views" + EXCLUDED."Views"
            """, ct);
    }
    public async Task<PageViewReport> ReportAsync(DateOnly from, DateOnly to, string? page, CancellationToken ct)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        var query = db.PageViews.AsNoTracking().Where(x => x.Date >= from && x.Date <= to);
        if (!string.IsNullOrWhiteSpace(page)) query = query.Where(x => x.Page == page);
        var totals = await query.GroupBy(x => x.Page).Select(g => new { Page = g.Key, Views = g.Sum(x => x.Views) }).OrderByDescending(x => x.Views).ToArrayAsync(ct);
        var pages = totals.Select(x => new PageViewCount(x.Page, x.Views)).ToArray();
        var daily = await query.GroupBy(x => x.Date).Select(g => new DailyViewCount(g.Key, g.Sum(x => x.Views))).ToDictionaryAsync(x => x.Date, ct);
        var days = Enumerable.Range(0, to.DayNumber - from.DayNumber + 1).Select(i => from.AddDays(i)).Select(d => daily.GetValueOrDefault(d) ?? new DailyViewCount(d, 0)).ToArray();
        return new(from, to, pages.Sum(x => x.Views), pages, days);
    }
}
