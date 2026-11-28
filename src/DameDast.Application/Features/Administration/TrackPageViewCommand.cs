using DameDast.Application.Interfaces.Administration;
using MediatR;
using Microsoft.Extensions.Logging;

namespace DameDast.Application.Features.Administration;

public sealed record TrackPageViewCommand(string Page) : IRequest;
public sealed class TrackPageViewHandler(IPageViewRecorder recorder, ILogger<TrackPageViewHandler> logger) : IRequestHandler<TrackPageViewCommand>
{
    private static readonly HashSet<string> Pages = new(StringComparer.Ordinal)
    {
        "workoutPrograms", "workoutTimer", "weightPlan", "learning", "developmentExercise", "languageEssays", "languageLessons", "languageVocabulary", "calendar", "workbench", "assets", "projects", "habits", "bookmarks", "organizer", "tasks", "reminders", "suggestions", "monthlyPlan", "monthlyExpenses", "notes", "connected", "overview", "transactions", "accounts", "budgets", "goals", "installments", "receivables", "locked", "market", "reports", "settings"
    };
    public Task Handle(TrackPageViewCommand request, CancellationToken cancellationToken)
    {
        if (request.Page is null || !Pages.Contains(request.Page)) return Task.CompletedTask;
        try { recorder.Record(request.Page); }
        catch (Exception exception) { logger.LogWarning("Could not enqueue page view: {ExceptionType}", exception.GetType().Name); }
        return Task.CompletedTask;
    }
}
