namespace Nexora.Domain.Auditing;

/// <summary>
/// Who did what to which record and when, for sensitive administrative actions. Written in the
/// same transaction as the change it describes, so the log can never miss or invent an action.
/// Never contains passwords, tokens or payment data.
/// </summary>
public sealed class AuditLogEntry
{
    public const int ActionMaxLength = 60;
    public const int EntityTypeMaxLength = 40;
    public const int EntityIdMaxLength = 60;
    public const int SummaryMaxLength = 500;
    public const int ActorEmailMaxLength = 254;

    // Required by EF Core for materialization.
    private AuditLogEntry()
    {
        Action = null!;
        EntityType = null!;
        EntityId = null!;
        Summary = null!;
        ActorEmail = null!;
    }

    public AuditLogEntry(Guid actorUserId, string actorEmail, string action, string entityType, string entityId, string summary, DateTimeOffset now)
    {
        Id = Guid.CreateVersion7();
        ActorUserId = actorUserId;
        ActorEmail = Truncate(actorEmail, ActorEmailMaxLength);
        Action = Truncate(action, ActionMaxLength);
        EntityType = Truncate(entityType, EntityTypeMaxLength);
        EntityId = Truncate(entityId, EntityIdMaxLength);
        Summary = Truncate(summary, SummaryMaxLength);
        CreatedAt = now;
    }

    public Guid Id { get; private set; }

    public Guid ActorUserId { get; private set; }

    public string ActorEmail { get; private set; }

    /// <summary>Dotted verb, e.g. "product.updated", "inventory.adjusted".</summary>
    public string Action { get; private set; }

    public string EntityType { get; private set; }

    public string EntityId { get; private set; }

    public string Summary { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}
