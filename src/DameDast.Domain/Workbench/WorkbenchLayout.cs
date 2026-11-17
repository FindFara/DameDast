namespace DameDast.Domain;

public sealed record WorkbenchLayout(int Version, int Columns, int Rows, string? Background,
    IReadOnlyList<WorkbenchWidget> Widgets);

public sealed record WorkbenchWidget(Guid Id, string Type, int X, int Y, int Width, int Height,
    string? Background = null, string? Title = null, Guid? ReferenceId = null, WorkbenchDevices? Devices = null);

public sealed record WorkbenchDevices(bool Phone = true, bool Tablet = true, bool Desktop = true);

public static class WorkbenchRules
{
    public const int Columns = 12;
    public const int Rows = 6;
    public static readonly string[] WidgetTypes =
        ["summary", "accounts", "installments", "notes", "canvas", "tasks", "goals", "markets", "allocation", "assets", "receivables", "reminders"];

    public static void Validate(WorkbenchLayout layout)
    {
        if (layout.Version != 1 || layout.Columns != Columns || layout.Rows != Rows ||
            !ValidColor(layout.Background) || layout.Widgets is null || layout.Widgets.Count > Columns * Rows)
            throw new FinanceException("Invalid workbench layout.");

        var ids = new HashSet<Guid>();
        var occupied = new HashSet<(int X, int Y)>();
        foreach (var widget in layout.Widgets)
        {
            if (widget is null || widget.Id == Guid.Empty || !ids.Add(widget.Id) ||
                !WidgetTypes.Contains(widget.Type) || !ValidColor(widget.Background) ||
                (widget.Title is not null && (widget.Title.Length > 60 || widget.Title != widget.Title.Trim())) ||
                (widget.ReferenceId.HasValue && (widget.ReferenceId == Guid.Empty || widget.Type is not ("notes" or "canvas"))) ||
                widget.X < 0 || widget.Y < 0 || widget.Width < 1 || widget.Height < 1 ||
                widget.Width > Columns || widget.Height > Rows || widget.X > Columns - widget.Width || widget.Y > Rows - widget.Height)
                throw new FinanceException("Invalid workbench card.");

            for (var x = widget.X; x < widget.X + widget.Width; x++)
                for (var y = widget.Y; y < widget.Y + widget.Height; y++)
                    if (!occupied.Add((x, y)))
                        throw new FinanceException("Workbench cards cannot overlap.");
        }
    }

    private static bool ValidColor(string? color) => color is null ||
        (color.Length == 7 && color[0] == '#' && color.AsSpan(1).IndexOfAnyExcept("0123456789abcdefABCDEF") < 0);
}
