namespace Nexora.Infrastructure.Persistence;

/// <summary>
/// Shadow property mapped to PostgreSQL's xmin system column. It changes on every update of the
/// row, so it works as an optimistic concurrency token without an extra column.
/// </summary>
internal static class ConcurrencyVersion
{
    public const string PropertyName = "Version";
}
