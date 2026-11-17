namespace Poolo.Domain;

public sealed record Goal(string Name, decimal Target, decimal Saved, DateOnly? Deadline, bool Pinned = false);
