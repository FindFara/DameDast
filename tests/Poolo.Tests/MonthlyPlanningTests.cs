using System.Text.Json;
using Poolo.Common;
using Poolo.Domain;
using Poolo.Infrastructure;
using Poolo.Infrastructure.Persistence.Repositories;
using Poolo.Infrastructure.Services.Market;
using Poolo.Infrastructure.Services.Benchmarks;
using Xunit;

namespace Poolo.Tests;

public sealed class MonthlyPlanningTests
{
    private static Mutation Change(string kind, object data, Guid? id = null, long version = 0) => new(Guid.NewGuid(), id ?? Guid.NewGuid(), kind, version, false, JsonSerializer.SerializeToElement(data, FinanceRules.Json));
    private static FinanceRecord Account() => FinanceRules.Apply([], Change("account", new Wallet("Main", 1000, "teal")));
    [Fact]
    public void PersianMonthEndUsesTheLeapYearAndKeepsCanonicalMonthKeys()
    {
        Assert.Equal(new DateOnly(2025, 3, 20), SolarCalendar.DayOfMonth("1403-12", 31));
        Assert.Equal(new DateOnly(2026, 3, 20), SolarCalendar.DayOfMonth("1404-12", 31));
        Assert.Equal("1405-08", new DateOnly(2026, 11, 16).MonthKey());
        Assert.False(SolarCalendar.ValidMonth("1405-8"));
        Assert.False(SolarCalendar.ValidMonth("2026-11"));
    }

    [Fact]
    public void PlanRejectsOverAllocationDuplicateRowsAndDuplicateMonths()
    {
        var plan = new AllocationPlan("1405-08", 100, [new("Home", 6000), new("Investment", 5000)]);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("allocationPlan", plan)));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("allocationPlan", plan with { Rows = [new("Home", 5000), new("Home", 5000)] })));
        var valid = plan with
        {
            Rows = [new("Home", 5000), new("Investment", 4000)]
        };
        var record = FinanceRules.Apply([], Change("allocationPlan", valid));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([record], Change("allocationPlan", valid)));
    }

    [Fact]
    public void CategoryMustExistAndCannotBeDeletedWhileUsed()
    {
        var account = Account();
        var category = FinanceRules.Apply([account], Change("category", new FinanceCategory("Travel fund", "#75b29a")));
        var key = "custom:" + category.Id;
        var tx = FinanceRules.Apply([account, category], Change("transaction", new Movement(account.Id, null, "expense", 100, key, new DateOnly(2026, 11, 16), "")));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([account, category, tx], new Mutation(Guid.NewGuid(), category.Id, "category", 1, true, default)));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([account], Change("transaction", new Movement(account.Id, null, "expense", 100, key, new DateOnly(2026, 11, 16), ""))));
    }

    [Fact]
    public void MonthlyPaymentCannotBeDuplicatedAndKeepsItsPersianMonth()
    {
        var account = Account();
        var bill = FinanceRules.Apply([account], Change("monthlyExpense", new MonthlyExpense("Internet", 100, "Home", 31, "1405-01", null, account.Id)));
        var movement = new Movement(account.Id, null, "expense", 100, "Home", new DateOnly(2026, 11, 16), "Internet", bill.Id, "1405-08");
        var payment = FinanceRules.Apply([account, bill], Change("transaction", movement));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([account, bill, payment], Change("transaction", movement)));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([account, bill], Change("transaction", movement with { RecurringMonth = "1405-09" })));
        FinanceRules.Apply([account, bill, payment], Change("transaction", movement with { Amount = 90 }, payment.Id, 1));
    }

    [Fact]
    public void GregorianBudgetRecordsRemainValidAndDoNotBecomePersianByAccident()
    {
        var legacy = FinanceRules.Apply([], Change("budget", new { category = "Home", limit = 100, month = "2026-11" }));
        Assert.Equal("gregory", FinanceRules.Read<Budget>(legacy.Data).Calendar);
        FinanceRules.Apply([legacy], Change("budget", new Budget("Home", 100, "1405-08", "persian")));
    }

    [Fact]
    public void NotesAndActualInvestmentValuesHaveBoundedDataAndConsistentDates()
    {
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("note", new PersonalNote("Note", new string ('a', 4001), false, new DateOnly(2026, 11, 16)))));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("investmentStep", new InvestmentStep("Step", 100, new DateOnly(2026, 11, 16), 120, null))));
        FinanceRules.Apply([], Change("investmentStep", new InvestmentStep("Step", 100, new DateOnly(2026, 11, 16), 0, new DateOnly(2026, 11, 16))));
    }

    [Fact]
    public void BenchmarkImportsRejectDuplicateDatesAndNonpositivePrices()
    {
        var series = new BenchmarkSeries("FUND", 2026, "Manual", [new(new DateOnly(2026, 11, 1), 100), new(new DateOnly(2026, 11, 1), 101)]);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("benchmarkSeries", series)));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("benchmarkSeries", series with { Points = [new(new DateOnly(2026, 11, 1), 0)] })));
    }

    [Fact]
    public void PublicHistoryParsersUseTheClosingPriceAndConvertRialOnce()
    {
        using var json = JsonDocument.Parse("""{"data":[["1","2","3","50000","","","2026/11/15"],["1","2","3","60000","","","2026/11/17"]]}""");
        var points = BenchmarkService.ParseTgju(json.RootElement, 10, new DateOnly(2026, 11, 16));
        Assert.Equal(5000, Assert.Single(points).Price);
        using var fund = JsonDocument.Parse("""{"closingPriceDaily":[{"dEven":20261115,"pClosing":45000,"zTotTran":100},{"dEven":20261114,"pClosing":44000,"zTotTran":0}]}""");
        Assert.Equal(4500, Assert.Single(BenchmarkService.ParseFund(fund.RootElement, new DateOnly(2026, 11, 16))).Price);
        using var search = JsonDocument.Parse("""{"instrumentSearch":[{"lVal18AFC":"یاقوت","lVal30":"صندوق یاقوت آگاه","insCode":"12345678901234567"}]}""");
        Assert.Equal("12345678901234567", BenchmarkService.SelectYaghoot(search.RootElement));
    }
}
