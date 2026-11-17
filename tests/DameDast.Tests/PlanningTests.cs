using System.Text.Json;
using DameDast.Domain;
using DameDast.Infrastructure;
using DameDast.Infrastructure.Persistence.Repositories;
using DameDast.Infrastructure.Services.Market;
using DameDast.Infrastructure.Services.Benchmarks;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Services;
using Xunit;

namespace DameDast.Tests;

public sealed class PlanningTests
{
    private static Mutation Change(string kind, object value) => new(Guid.NewGuid(), Guid.NewGuid(), kind, 0, false, JsonSerializer.SerializeToElement(value, FinanceRules.Json));
    [Fact]
    public void PartialRepaymentCannotExceedPrincipal()
    {
        var loan = new Receivable("Alex", 100, 101, new DateOnly(2026, 11, 15), null, "");
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("receivable", loan)));
        var accepted = FinanceRules.Apply([], Change("receivable", loan with { Returned = 40 }));
        Assert.Equal(40, FinanceRules.Read<Receivable>(accepted.Data).Returned);
    }

    [Fact]
    public void ReminderWindowExcludesPaidAndOldInstallments()
    {
        var today = new DateOnly(2026, 11, 15);
        var installment = new Installment("Loan", 100, today.AddDays(3), false, 3);
        Assert.True(InstallmentReminderRules.IsDue(installment, today));
        Assert.False(InstallmentReminderRules.IsDue(installment with { Paid = true }, today));
        Assert.False(InstallmentReminderRules.IsDue(installment with { DueDate = today.AddDays(4) }, today));
        Assert.False(InstallmentReminderRules.IsDue(installment with { DueDate = today.AddDays(-8) }, today));
        Assert.True(InstallmentReminderRules.IsDue(installment with { DueDate = today.AddDays(-1) }, today));
    }

    [Fact]
    public void PushEndpointCannotTargetArbitraryOrLocalServers()
    {
        foreach (var endpoint in new[]
        {
            "http://fcm.googleapis.com/test",
            "https://127.0.0.1/",
            "https://evil.example/push",
            "https://fcm.googleapis.com.evil.example/",
            "https://fcm.googleapis.com:8443/"
        }

        )
            Assert.Throws<FinanceException>(() => PushRegistrationRules.ValidateEndpoint(endpoint));
        PushRegistrationRules.ValidateEndpoint("https://fcm.googleapis.com/fcm/send/test");
    }

    [Fact]
    public void IranianQuotesConvertRialToTomanAndKeepBitcoinInUsd()
    {
        using var json = JsonDocument.Parse("""
        {"current":{"geram18":{"p":"52,000,000","dp":1.2,"dt":"high","ts":"2026-11-15 15:00:00"},"price_dollar_rl":{"p":"920,000","dp":0.4,"dt":"low","ts":"2026-11-15 15:00:00"},"silver_999":{"p":"850,000","dp":2.1,"dt":"high","ts":"2026-11-15 15:00:00"},"crypto-bitcoin":{"p":"89000.50","dp":1.7,"dt":"high","ts":"2026-11-15 15:00:00"}}}
        """);
        var quotes = MarketService.ParseQuotes(json.RootElement);
        Assert.Equal(5200000, quotes.Single(q => q.Symbol == "GOLD").Price);
        Assert.Equal(92000, quotes.Single(q => q.Symbol == "USD").Price);
        Assert.Equal(-.4m, quotes.Single(q => q.Symbol == "USD").ChangePercent);
        Assert.Equal(89000.50m, quotes.Single(q => q.Symbol == "BTC").Price);
        Assert.Equal(TimeSpan.FromHours(3.5), quotes[0].AsOf.Offset);
    }

    [Fact]
    public void HistoryUsesClosingColumnAndSkipsMalformedRows()
    {
        using var json = JsonDocument.Parse("""{"data":[["100","90","110","105","","","2026/11/14"],["1"]]}""");
        var points = MarketService.ParseHistory(json.RootElement, 10, new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero));
        Assert.Equal(10.5m, Assert.Single(points).Price);
    }
}
