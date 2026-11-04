using Nexora.Application.Admin;

namespace Nexora.UnitTests.Admin;

public sealed class CsvWriterTests
{
    [Theory]
    [InlineData("=HYPERLINK(\"http://evil\")", "\"'=HYPERLINK(\"\"http://evil\"\")\"")]
    [InlineData("+51 987654321", "'+51 987654321")]
    [InlineData("-2+3", "'-2+3")]
    [InlineData("@SUM(A1)", "'@SUM(A1)")]
    [InlineData("Ana Pérez", "Ana Pérez")]
    public void TextThatLooksLikeAFormulaIsNeutralized(string value, string expected)
    {
        Assert.Equal(expected, CsvWriter.FormatCell(value));
    }

    [Fact]
    public void QuotesAndSeparatorsAreEscaped()
    {
        Assert.Equal("\"Calle \"\"Los Pinos\"\", 123\"", CsvWriter.FormatCell("Calle \"Los Pinos\", 123"));
    }

    [Fact]
    public void NumbersUseInvariantFormattingAndAreNotPrefixed()
    {
        Assert.Equal("-12.50", CsvWriter.FormatCell(-12.5m));
        Assert.Equal("3", CsvWriter.FormatCell(3));
    }

    [Fact]
    public void RowsEndWithCrLf()
    {
        Assert.Equal("a,b\r\n", new CsvWriter().WriteRow("a", "b").ToString());
    }
}
