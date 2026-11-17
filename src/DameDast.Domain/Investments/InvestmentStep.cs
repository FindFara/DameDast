namespace DameDast.Domain;

public sealed record InvestmentStep(string Title, decimal Amount, DateOnly Date, decimal? ActualValue, DateOnly? ValueDate);
