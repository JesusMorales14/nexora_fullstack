using System.Globalization;
using System.Text;

namespace Nexora.Application.Admin;

/// <summary>
/// Minimal RFC 4180 CSV writer with protection against CSV/formula injection: a cell that starts
/// with = + - @ tab or carriage return is prefixed with an apostrophe so spreadsheet apps show it
/// as text instead of executing it (customer-controlled names end up in these reports).
/// </summary>
public sealed class CsvWriter
{
    private static readonly char[] FormulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
    private static readonly char[] CharactersRequiringQuotes = [',', '"', '\n', '\r'];

    private readonly StringBuilder _builder = new();

    public CsvWriter WriteRow(params object?[] values)
    {
        ArgumentNullException.ThrowIfNull(values);

        _builder.AppendJoin(',', values.Select(FormatCell));
        _builder.Append("\r\n");
        return this;
    }

    public override string ToString() => _builder.ToString();

    public static string FormatCell(object? value)
    {
        var text = value switch
        {
            null => string.Empty,
            // Numbers are written with a dot decimal separator and are never treated as formulas.
            decimal number => number.ToString("0.00", CultureInfo.InvariantCulture),
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString() ?? string.Empty,
        };

        if (value is string && text.Length > 0 && FormulaTriggers.Contains(text[0]))
        {
            text = "'" + text;
        }

        return text.IndexOfAny(CharactersRequiringQuotes) >= 0
            ? "\"" + text.Replace("\"", "\"\"", StringComparison.Ordinal) + "\""
            : text;
    }
}
