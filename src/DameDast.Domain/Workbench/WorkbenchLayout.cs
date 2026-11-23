namespace DameDast.Domain;

public sealed record WorkbenchLayout(int Version, int Columns, int Rows, string? Background,
    IReadOnlyList<WorkbenchWidget> Widgets);

public sealed record WorkbenchWidget(Guid Id, string Type, int X, int Y, int Width, int Height,
    string? Background = null, string? Title = null, Guid? ReferenceId = null, WorkbenchDevices? Devices = null,
    WorkbenchWidgetOptions? Options = null);

public sealed record WorkbenchDevices(bool Phone = true, bool Tablet = true, bool Desktop = true);

public static class WorkbenchRules
{
    public const int Columns = 12;
    public const int Rows = 6;
    public static readonly string[] WidgetTypes =
        ["summary", "accounts", "installments", "notes", "canvas", "tasks", "goals", "markets", "allocation", "assets", "receivables", "reminders",
         "image", "plainCalendar", "link", "calculator", "keyGenerator", "clock", "pet", "search", "googleServices", "shortcut"];

    public static (int Width, int Height) StandardSize(string type) => type switch {
        "shortcut" => (1,1), "search" => (8,1),
        "plainCalendar" or "calculator" or "keyGenerator" or "allocation" => (4,3), _ => (4,2)
    };

    public static void Validate(WorkbenchLayout layout)
    {
        if (layout.Version is not (1 or 2 or 3) || layout.Columns != (layout.Version == 3 ? 24 : Columns) ||
            (layout.Version == 1 ? layout.Rows != Rows : layout.Rows < (layout.Version == 3 ? 12 : Rows) || layout.Rows > (layout.Version == 3 ? 864 : 72)) ||
            !ValidColor(layout.Background) || layout.Widgets is null || layout.Widgets.Count > Columns * Rows ||
            layout.Widgets.Count(widget => widget?.Type == "image") > 4)
            throw new FinanceException("Invalid workbench layout.");

        var ids = new HashSet<Guid>();
        var occupied = new HashSet<(int X, int Y)>();
        foreach (var widget in layout.Widgets)
        {
            if (widget is null || widget.Id == Guid.Empty || !ids.Add(widget.Id) ||
                !WidgetTypes.Contains(widget.Type) || !ValidColor(widget.Background) ||
                (widget.Title is not null && (widget.Title.Length > 60 || widget.Title != widget.Title.Trim())) ||
                (widget.ReferenceId.HasValue && (widget.ReferenceId == Guid.Empty || widget.Type is not ("notes" or "canvas"))) ||
                (layout.Version == 2 && StandardSize(widget.Type) != (widget.Width, widget.Height)) ||
                widget.X < 0 || widget.Y < 0 || widget.Width < 1 || widget.Height < 1 ||
                widget.Width > layout.Columns || widget.Height > (layout.Version == 3 ? 12 : Rows) || widget.X > layout.Columns - widget.Width || widget.Y > layout.Rows - widget.Height)
                throw new FinanceException("Invalid workbench card.");
            WorkbenchOptionRules.Validate(widget.Type, widget.Options);

            for (var x = widget.X; x < widget.X + widget.Width; x++)
                for (var y = widget.Y; y < widget.Y + widget.Height; y++)
                    if (!occupied.Add((x, y)))
                        throw new FinanceException("Workbench cards cannot overlap.");
        }
    }

    private static bool ValidColor(string? color) => color is null ||
        (color.Length == 7 && color[0] == '#' && color.AsSpan(1).IndexOfAnyExcept("0123456789abcdefABCDEF") < 0);
}
