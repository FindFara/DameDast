namespace DameDast.Domain;

public sealed record Budget(string Category, decimal Limit, string Month, string Calendar = "gregory");
