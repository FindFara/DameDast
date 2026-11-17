using Microsoft.Extensions.DependencyInjection;
using Poolo.Application.Interfaces.Whiteboards;
using Poolo.Application.Interfaces.Assets;
using Poolo.Application.Interfaces.Workbench;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Interfaces.Notes;
using Poolo.Application.Interfaces.Goals;
using Poolo.Application.Behaviors;
using Poolo.Application.Features.FinanceRecords.Commands;
using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Services;
using Poolo.Application.Features.FinanceRecords.Validation;
using Poolo.Application.Features.Portfolio.Commands;
using Poolo.Application.Interfaces.Portfolio;
using Poolo.Application.Interfaces.Reminders;

namespace Poolo.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration =>
        {
            configuration.RegisterServicesFromAssemblyContaining<SyncFinanceCommand>();
            configuration.AddOpenBehavior(typeof(AuthorizationBehavior<, >));
            configuration.AddOpenBehavior(typeof(ValidationBehavior<, >));
        });
        services.AddScoped<IWorkbenchService, WorkbenchService>();
        services.AddScoped<IWhiteboardService, WhiteboardService>();
        services.AddScoped<IAssetPerformanceService, AssetPerformanceService>();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<IGoalService, GoalService>();
        services.AddScoped<IPersonalReminderService, PersonalReminderService>();
        services.AddScoped<IFinanceService, FinanceService>();
        services.AddScoped<IPortfolioService, PortfolioService>();
        services.AddScoped<IPushSubscriptionService, PushSubscriptionService>();
        services.AddScoped<IReminderService, ReminderService>();
        services.AddTransient<IRequestValidator<SyncFinanceCommand>, SyncBatchValidator<SyncFinanceCommand>>();
        services.AddTransient<IRequestValidator<SyncPortfolioCommand>, SyncBatchValidator<SyncPortfolioCommand>>();
        return services;
    }
}
