using System.Text.Json;
using DameDast.Domain;
using DameDast.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DameDast.Tests;

public sealed class ProductivityTests
{
    private static Mutation Change(string kind, object value, Guid? id = null, long version = 0) => new(Guid.NewGuid(), id ?? Guid.NewGuid(), kind, version, false, JsonSerializer.SerializeToElement(value, FinanceRules.Json));
    private static Installment Loan => new("Rent", 1500, new DateOnly(2026, 11, 28), false, 3);

    [Fact]
    public async Task PaymentRetryEditAndReversalKeepOneMatchingExpenseInTheChosenAccount()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using (var db = database.CreateDbContext()) await db.Database.MigrateAsync();
        var repo = new FinanceRepository(database, TimeProvider.System);
        var account = Change("account", new Wallet("Bank", 10000, "teal"));
        var loan = Change("installment", Loan);
        await repo.ApplyAsync("alice", [account, loan], default);
        var payment = new InstallmentPayment(Guid.NewGuid(), account.Id, new DateOnly(2026, 11, 24), "Home");
        var pay = Change("installment", Loan with { Paid = true, Payment = payment }, loan.Id, 1);
        var paid = await repo.ApplyAsync("alice", [pay], default);
        var retry = await repo.ApplyAsync("alice", [pay], default);
        Assert.Equal(paid.Revision, retry.Revision);
        Assert.Equal(3, retry.Records.Count);
        var expense = Assert.Single(paid.Records, r => r.Kind == "transaction");
        var movement = FinanceRules.Read<Movement>(expense.Data);
        Assert.Equal(account.Id, movement.AccountId);
        Assert.Equal(loan.Id, movement.InstallmentId);
        Assert.Equal(1500, movement.Amount);
        Assert.Equal("expense", movement.Type);
        await Assert.ThrowsAsync<FinanceException>(() => repo.ApplyAsync("alice", [Change("transaction", movement with { Amount = 2000 }, expense.Id, expense.Version)], default));
        var edited = Change("installment", Loan with { Amount = 2000, Paid = true, Payment = payment }, loan.Id, 2);
        var updated = await repo.ApplyAsync("alice", [edited], default);
        Assert.Equal(2000, FinanceRules.Read<Movement>(updated.Records.Single(r => r.Id == expense.Id).Data).Amount);
        var reverse = Change("installment", Loan with { Amount = 2000 }, loan.Id, 3);
        var reversed = await repo.ApplyAsync("alice", [reverse], default);
        Assert.True(reversed.Records.Single(r => r.Id == expense.Id).Deleted);
        Assert.False(FinanceRules.Read<Installment>(reversed.Records.Single(r => r.Id == loan.Id).Data).Paid);
        Assert.Empty((await repo.ReadAsync("bob", default)).Records);
    }

    [Fact]
    public async Task InvalidPaymentAndCompetingDevicesCannotLeavePartialOrDuplicateExpenses()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using (var db = database.CreateDbContext()) await db.Database.MigrateAsync();
        var repo = new FinanceRepository(database, TimeProvider.System);
        var a = Change("account", new Wallet("A", 10000, "teal"));
        var b = Change("account", new Wallet("B", 10000, "blue"));
        var loan = Change("installment", Loan);
        await repo.ApplyAsync("alice", [a, b, loan], default);
        var invalid = Change("installment", Loan with { Paid = true, Payment = new(Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 11, 24), "Home") }, loan.Id, 1);
        await Assert.ThrowsAsync<FinanceException>(() => repo.ApplyAsync("alice", [invalid], default));
        var unchanged = await repo.ReadAsync("alice", default);
        Assert.Equal(1, unchanged.Records.Single(r => r.Id == loan.Id).Version);
        Assert.DoesNotContain(unchanged.Records, r => r.Kind == "transaction");
        var changes = new[] { a, b }.Select(account => Change("installment", Loan with { Paid = true, Payment = new(Guid.NewGuid(), account.Id, new DateOnly(2026, 11, 24), "Home") }, loan.Id, 1)).ToArray();
        var attempts = await Task.WhenAll(changes.Select(async change => { try { await repo.ApplyAsync("alice", [change], default); return true; } catch (ConflictException) { return false; } }));
        Assert.Single(attempts, success => success);
        Assert.Single((await repo.ReadAsync("alice", default)).Records, r => r.Kind == "transaction" && !r.Deleted);
    }

    [Fact]
    public async Task HabitHistoryCanBeUncheckedRecheckedAndDeletedWithoutOrphaningBackupRecords()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using (var db = database.CreateDbContext()) await db.Database.MigrateAsync();
        var repo = new FinanceRepository(database, TimeProvider.System);
        var habit = Change("habit", new Habit("Read", 3, new DateOnly(2026, 11, 1)));
        var log = Change("habitLog", new HabitLog(habit.Id, new DateOnly(2026, 11, 24)));
        await repo.ApplyAsync("alice", [habit, log], default);
        var uncheckedLog = Change("habitLog", new HabitLog(habit.Id, new DateOnly(2026, 11, 24), false), log.Id, 1);
        await repo.ApplyAsync("alice", [uncheckedLog], default);
        var rechecked = await repo.ApplyAsync("alice", [log with { OperationId = Guid.NewGuid(), ExpectedVersion = 2 }], default);
        Assert.True(FinanceRules.Read<HabitLog>(rechecked.Records.Single(r => r.Id == log.Id).Data).Done);
        await Assert.ThrowsAsync<FinanceException>(() => repo.ApplyAsync("alice", [Change("habit", new Habit("Read", 3, new DateOnly(2026, 11, 25)), habit.Id, 1)], default));
        var deleted = await repo.ApplyAsync("alice", [new Mutation(Guid.NewGuid(), habit.Id, "habit", 1, true, JsonSerializer.SerializeToElement<object?>(null))], default);
        Assert.All(deleted.Records, r => Assert.True(r.Deleted));
    }

    [Fact]
    public void ProjectsHabitsAndLinksValidateReferencesAndRejectUnsafeOrDuplicateData()
    {
        var project = FinanceRules.Apply([], Change("project", new Project("چمدون")));
        var note = Change("note", new PersonalNote("Packing", "List", false, new DateOnly(2026, 11, 24), ProjectId: project.Id));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], note));
        var saved = FinanceRules.Apply([project], note);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([project, saved], new Mutation(Guid.NewGuid(), project.Id, "project", 1, true, default)));
        var habit = FinanceRules.Apply([], Change("habit", new Habit("Read", 3, new DateOnly(2026, 11, 1))));
        var log = Change("habitLog", new HabitLog(habit.Id, new DateOnly(2026, 11, 24)));
        var logged = FinanceRules.Apply([habit], log);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([habit, logged], log with { Id = Guid.NewGuid() }));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("habit", new Habit("Read", 8, new DateOnly(2026, 11, 1)))));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("bookmark", new Bookmark("Unsafe", "javascript:alert(1)", "", ["Read later"]))));
        Assert.Equal("bookmark", FinanceRules.Apply([project], Change("bookmark", new Bookmark(".NET", "https://dot.net/", "Selected text", ["Read later"], project.Id))).Kind);
    }
}
