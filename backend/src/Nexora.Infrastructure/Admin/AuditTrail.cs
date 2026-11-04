using Microsoft.EntityFrameworkCore;
using Nexora.Application.Admin;
using Nexora.Application.Common;
using Nexora.Domain.Auditing;
using Nexora.Infrastructure.Persistence;

namespace Nexora.Infrastructure.Admin;

/// <summary>
/// Stages an audit entry in the current DbContext. It is saved by the same SaveChanges as the
/// change it describes: both are committed together or not at all.
/// </summary>
internal sealed class AuditTrail(NexoraDbContext db, ICurrentUser currentUser, TimeProvider timeProvider)
{
    public void Record(string action, string entityType, object entityId, string summary) =>
        db.AuditLog.Add(new AuditLogEntry(
            currentUser.UserId,
            currentUser.Email,
            action,
            entityType,
            entityId.ToString() ?? string.Empty,
            summary,
            timeProvider.GetUtcNow()));
}

internal sealed class AuditLogQueries(NexoraDbContext db) : IAuditLogQueries
{
    public async Task<PagedResponse<AuditLogEntryResponse>> ListAsync(int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = db.AuditLog.AsNoTracking();
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(entry => entry.CreatedAt)
            .ThenByDescending(entry => entry.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(entry => new AuditLogEntryResponse(
                entry.Id, entry.ActorEmail, entry.Action, entry.EntityType, entry.EntityId, entry.Summary, entry.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResponse<AuditLogEntryResponse>(items, page, pageSize, total);
    }
}
