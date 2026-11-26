namespace DameDast.Domain;

public sealed record LanguageWord(string Term, string Meaning, string Example = "");
public sealed record LanguageVocabulary(DateOnly Date, string Title, string Topic, IReadOnlyList<LanguageWord> Words, bool Read);
public sealed record EssayCorrection(Guid Id, int? Start, int? End, string Original, string Replacement, string Explanation);
public sealed record LanguageEssay(DateOnly Date, string Title, string Body, Guid VocabularyId, IReadOnlyList<LanguageWord> AssignedWords, IReadOnlyList<EssayCorrection> Corrections, bool Reviewed, string ReviewNotes = "");
public sealed record LanguageLesson(string Title, string Markdown, string FileName);

public static class LanguageRules
{
    public static bool TryValidate(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        switch (change.Kind)
        {
            case "languageVocabulary":
                var vocabulary = FinanceRules.Read<LanguageVocabulary>(change.Data);
                ValidateDay(records, change, vocabulary.Date);
                RequireText(vocabulary.Title, 120);
                RequireText(vocabulary.Topic, 300);
                ValidateWords(vocabulary.Words);
                return true;
            case "languageEssay":
                ValidateEssay(records, change, FinanceRules.Read<LanguageEssay>(change.Data));
                return true;
            case "languageLesson":
                var lesson = FinanceRules.Read<LanguageLesson>(change.Data);
                RequireText(lesson.Title, 120);
                RequireText(lesson.Markdown, 200000);
                RequireText(lesson.FileName, 200, true);
                return true;
            default: return false;
        }
    }

    private static void ValidateEssay(IReadOnlyList<FinanceRecord> records, Mutation change, LanguageEssay essay)
    {
        ValidateDay(records, change, essay.Date);
        RequireText(essay.Title, 120, true);
        RequireText(essay.Body, 20000);
        RequireText(essay.ReviewNotes, 5000, true);
        ValidateWords(essay.AssignedWords);
        var source = records.SingleOrDefault(r => !r.Deleted && r.Kind == "languageVocabulary" && r.Id == essay.VocabularyId);
        if (source is null || FinanceRules.Read<LanguageVocabulary>(source.Data).Date != essay.Date)
            throw new FinanceException("Save the daily words before the essay.");
        var previous = records.SingleOrDefault(r => !r.Deleted && r.Id == change.Id);
        var old = previous is null ? null : FinanceRules.Read<LanguageEssay>(previous.Data);
        var expected = old?.AssignedWords ?? FinanceRules.Read<LanguageVocabulary>(source.Data).Words;
        if (!essay.AssignedWords.SequenceEqual(expected) || old is not null && (essay.Date != old.Date || essay.VocabularyId != old.VocabularyId))
            throw new FinanceException("The assigned words changed. Reopen the essay.");
        ValidateCorrections(essay);
    }

    private static void ValidateCorrections(LanguageEssay essay)
    {
        if (essay.Corrections is null || essay.Corrections.Count > 100 || essay.Corrections.Any(c => c is null || c.Id == Guid.Empty)
            || essay.Corrections.Select(c => c.Id).Distinct().Count() != essay.Corrections.Count)
            throw new FinanceException("Invalid essay corrections.");
        var ranges = new List<(int Start, int End)>();
        foreach (var correction in essay.Corrections)
        {
            RequireText(correction.Original, 2000);
            RequireText(correction.Replacement, 2000);
            RequireText(correction.Explanation, 1000, true);
            if (correction.Start is null && correction.End is null) continue;
            if (correction.Start is not int start || correction.End is not int end || start < 0 || end <= start || end > essay.Body.Length
                || essay.Body[start..end] != correction.Original || ranges.Any(r => start < r.End && end > r.Start))
                throw new FinanceException("Select a different part of the essay.");
            ranges.Add((start, end));
        }
    }

    private static void ValidateWords(IReadOnlyList<LanguageWord>? words)
    {
        if (words is null || words.Count is < 1 or > 30 || words.Any(w => w is null)
            || words.Select(w => w.Term).Distinct(StringComparer.OrdinalIgnoreCase).Count() != words.Count)
            throw new FinanceException("Enter up to 30 unique words with their meanings.");
        foreach (var word in words)
        {
            RequireText(word.Term, 80);
            RequireText(word.Meaning, 200);
            RequireText(word.Example, 300, true);
            if (word.Term != word.Term.Trim()) throw new FinanceException("Enter up to 30 unique words with their meanings.");
        }
    }

    private static void ValidateDay(IReadOnlyList<FinanceRecord> records, Mutation change, DateOnly day)
    {
        if (day.Year is < 2000 or > 2100) throw new FinanceException("Choose a valid language date.");
        if (records.Any(r => !r.Deleted && r.Kind == change.Kind && r.Id != change.Id && r.Data.GetProperty("date").GetString() == day.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture)))
            throw new FinanceException("This day already has an entry. Open it to edit.");
    }

    private static void RequireText(string? value, int max, bool empty = false)
    {
        if (value is null || value.Length > max || !empty && string.IsNullOrWhiteSpace(value))
            throw new FinanceException("Enter valid language content within the allowed size.");
    }
}
