namespace DameDast.Domain;

public sealed record DrawingDocument(int Version, double Width, double Height, IReadOnlyList<DrawingElement> Elements);
public sealed record DrawingElement(Guid Id, string Type, double X, double Y, double Width, double Height,
    string Color, double StrokeWidth, IReadOnlyList<DrawingPoint>? Points = null, string? Text = null);
public sealed record DrawingPoint(double X, double Y, double Pressure = 0.5);

public static class DrawingRules
{
    public static void Validate(DrawingDocument drawing)
    {
        if (drawing.Version != 1 || !Bounded(drawing.Width, 320, 8000) || !Bounded(drawing.Height, 320, 8000)
            || drawing.Elements is null || drawing.Elements.Count > 500 || drawing.Elements.Any(x => x is null) || drawing.Elements.Select(x => x.Id).Distinct().Count() != drawing.Elements.Count)
            throw new FinanceException("Invalid drawing document.");
        var points = 0;
        foreach (var element in drawing.Elements)
        {
            if (element.Id == Guid.Empty || element.Type is not ("pen" or "marker" or "line" or "arrow" or "rectangle" or "ellipse" or "text")
                || !Bounded(element.X, 0, drawing.Width) || !Bounded(element.Y, 0, drawing.Height)
                || !Bounded(element.Width, -drawing.Width, drawing.Width) || !Bounded(element.Height, -drawing.Height, drawing.Height)
                || element.Color is null || !System.Text.RegularExpressions.Regex.IsMatch(element.Color, "^#[0-9a-fA-F]{6}$")
                || !Bounded(element.StrokeWidth, 1, 32) || element.Text is { Length: > 1000 }
                || element.Type == "text" && string.IsNullOrWhiteSpace(element.Text))
                throw new FinanceException("Invalid drawing element.");
            if (element.Points is { } stroke)
            {
                points += stroke.Count;
                if (stroke.Count > 4000 || points > 20000 || stroke.Any(p => p is null || !Bounded(p.X, 0, drawing.Width)
                    || !Bounded(p.Y, 0, drawing.Height) || !Bounded(p.Pressure, 0, 1)))
                    throw new FinanceException("Drawing is too large or contains invalid points.");
            }
            if (element.Type is "pen" or "marker" && element.Points is not { Count: > 0 })
                throw new FinanceException("A pen stroke needs points.");
        }
    }
    private static bool Bounded(double value, double min, double max) => double.IsFinite(value) && value >= min && value <= max;
}
