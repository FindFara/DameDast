namespace DameDast.Domain;

public sealed record LockedAsset(string Name, decimal Amount, DateOnly? ReleaseDate, string Note);
