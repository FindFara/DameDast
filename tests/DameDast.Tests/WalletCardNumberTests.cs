using System.Text.Json;
using DameDast.Domain;
using Xunit;

namespace DameDast.Tests;

public sealed class WalletCardNumberTests
{
    [Fact]
    public void CardNumberSurvivesSerializationAndAccountUpdates()
    {
        var wallet = new Wallet("Main", 100, "teal", "0000000000000001");
        var saved = FinanceRules.Apply([], Change(wallet));
        var loaded = FinanceRules.Read<Wallet>(saved.Data);
        Assert.Equal(wallet.CardNumber, loaded.CardNumber);
        var updated = FinanceRules.Apply([saved], Change(loaded with { Name = "Renamed" }, saved.Id, saved.Version));
        Assert.Equal(wallet.CardNumber, FinanceRules.Read<Wallet>(updated.Data).CardNumber);
    }

    [Fact]
    public void LegacyAccountsAndCashWalletsDoNotRequireACardNumber()
    {
        var legacy = new Mutation(Guid.NewGuid(), Guid.NewGuid(), "account", 0, false,
            JsonSerializer.SerializeToElement(new { name = "Cash", openingBalance = 100, color = "teal" }));
        Assert.Null(FinanceRules.Read<Wallet>(FinanceRules.Apply([], legacy).Data).CardNumber);
        FinanceRules.Apply([], Change(new Wallet("Cash", 100, "teal", "")));
    }

    [Theory]
    [InlineData("123")]
    [InlineData("00000000000000000")]
    [InlineData("000000000000000x")]
    public void InvalidCardNumbersAreRejectedByTheServer(string cardNumber) =>
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change(new Wallet("Main", 100, "teal", cardNumber))));

    private static Mutation Change(Wallet wallet, Guid? id = null, long version = 0) =>
        new(Guid.NewGuid(), id ?? Guid.NewGuid(), "account", version, false, JsonSerializer.SerializeToElement(wallet, FinanceRules.Json));
}
