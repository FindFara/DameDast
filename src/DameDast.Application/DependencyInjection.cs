using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using DameDast.Application.Interfaces.Whiteboards;
using DameDast.Application.Interfaces.Assets;
using DameDast.Application.Interfaces.Workbench;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Interfaces.Notes;
using DameDast.Application.Interfaces.Goals;
using DameDast.Application.Behaviors;
using DameDast.Application.Features.FinanceRecords.Commands;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Services;
using DameDast.Application.Features.FinanceRecords.Validation;
using DameDast.Application.Features.Portfolio.Commands;
using DameDast.Application.Interfaces.Portfolio;
using DameDast.Application.Interfaces.Reminders;

namespace DameDast.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.TryAddSingleton(TimeProvider.System);
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
