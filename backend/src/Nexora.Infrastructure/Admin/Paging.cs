namespace Nexora.Infrastructure.Admin;

/// <summary>Admin lists are always paginated with a hard upper bound.</summary>
public static class Paging
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    public static (int Page, int PageSize) Normalize(int? page, int? pageSize) =>
        (Math.Max(page ?? 1, 1), Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize));

    /// <summary>Escapes LIKE wildcards in user input (see ProductCatalog).</summary>
    public static string ContainsPattern(string value) =>
        "%" + value.Trim()
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal) + "%";

    public const string LikeEscape = "\\";
}
