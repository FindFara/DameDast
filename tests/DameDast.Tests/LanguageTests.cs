using System.Text.Json;
using DameDast.Domain;
using Xunit;

namespace DameDast.Tests;

public sealed class LanguageTests
{
    private static readonly DateOnly Day = new(2026, 11, 26);
    private static readonly LanguageWord[] Words = [new("happy", "خوشحال", "I am happy.")];
    private static Mutation Change(string kind, object data, Guid? id = null, long version = 0) => new(Guid.NewGuid(), id ?? Guid.NewGuid(), kind, version, false, JsonSerializer.SerializeToElement(data, FinanceRules.Json));
    private static FinanceRecord Vocabulary() => FinanceRules.Apply([], Change("languageVocabulary", new LanguageVocabulary(Day, "Feelings", "Write about your day.", Words, false)));
    private static LanguageEssay Essay(Guid vocabularyId) => new(Day, "My day", "I is happy.", vocabularyId, Words, [new(Guid.NewGuid(), 2, 4, "is", "am", "Use am with I.")], true);

    [Fact]
    public void ReviewNotesPersistAndOldEssaysRemainReadable()
    {
        var vocabulary = Vocabulary();
        var essay = Essay(vocabulary.Id) with { ReviewNotes = "Use am with I. فارسی", Reviewed = false };
        var saved = FinanceRules.Apply([vocabulary], Change("languageEssay", essay));
        Assert.Equal(essay.ReviewNotes, FinanceRules.Read<LanguageEssay>(saved.Data).ReviewNotes);
        var legacy = JsonSerializer.SerializeToElement(new { essay.Date, essay.Title, essay.Body, essay.VocabularyId, essay.AssignedWords, essay.Corrections, essay.Reviewed }, FinanceRules.Json);
        Assert.Equal("", FinanceRules.Read<LanguageEssay>(legacy).ReviewNotes);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([vocabulary], Change("languageEssay", essay with { ReviewNotes = new string('x', 5001) })));
    }

    [Fact]
    public void EssayAndCorrectionsRoundTripWithTheAssignedWords()
    {
        var vocabulary = Vocabulary();
        var essay = Essay(vocabulary.Id);
        var saved = FinanceRules.Apply([vocabulary], Change("languageEssay", essay));
        var loaded = FinanceRules.Read<LanguageEssay>(saved.Data);
        Assert.Equal("is", loaded.Corrections[0].Original);
        Assert.Equal("am", loaded.Corrections[0].Replacement);
        Assert.Equal(Words, loaded.AssignedWords);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("languageEssay", essay)));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([vocabulary, saved], Change("languageEssay", essay)));
    }

    [Fact]
    public void ChangingDailyWordsDoesNotRewriteTheWordsOfAnExistingEssay()
    {
        var vocabulary = Vocabulary();
        var saved = FinanceRules.Apply([vocabulary], Change("languageEssay", Essay(vocabulary.Id)));
        var edited = FinanceRules.Apply([vocabulary, saved], Change("languageVocabulary", new LanguageVocabulary(Day, "Other", "Another topic.", [new("other", "دیگر")], false), vocabulary.Id, vocabulary.Version));
        FinanceRules.Apply([edited, saved], Change("languageEssay", Essay(vocabulary.Id) with { Title = "Edited" }, saved.Id, saved.Version));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([edited, saved], Change("languageEssay", Essay(vocabulary.Id) with { AssignedWords = [new("other", "دیگر")] }, saved.Id, saved.Version)));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([vocabulary, saved], new Mutation(Guid.NewGuid(), vocabulary.Id, vocabulary.Kind, vocabulary.Version, true, default)));
    }

    [Fact]
    public void CorrectionRangesMustMatchTheActualBodyAndCannotOverlap()
    {
        var vocabulary = Vocabulary();
        var essay = Essay(vocabulary.Id);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([vocabulary], Change("languageEssay", essay with { Corrections = [essay.Corrections[0] with { End = 10 }] })));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([vocabulary], Change("languageEssay", essay with { Corrections = [essay.Corrections[0], essay.Corrections[0] with { Id = Guid.NewGuid() }] })));
        FinanceRules.Apply([vocabulary], Change("languageEssay", essay with { Body = "I am happy.", Corrections = [essay.Corrections[0] with { Start = null, End = null }] }));
    }

    [Fact]
    public void MarkdownContentIsPreservedAndSizeIsBounded()
    {
        var lesson = new LanguageLesson("Lesson", "# Lesson\n\n**Mixed فارسی English**", "lesson.md");
        var saved = FinanceRules.Apply([], Change("languageLesson", lesson));
        Assert.Equal(lesson, FinanceRules.Read<LanguageLesson>(saved.Data));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change("languageLesson", lesson with { Markdown = new string('x', 200001) })));
    }
}
