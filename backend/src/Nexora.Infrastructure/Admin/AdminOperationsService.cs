using System.Globalization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Nexora.Application.Admin;
using Nexora.Application.Auth;
using Nexora.Application.Common;
using Nexora.Domain.Common;
using Nexora.Domain.Ordering;
using Nexora.Infrastructure.Identity;
using Nexora.Infrastructure.Ordering;
using Nexora.Infrastructure.Persistence;
using Nexora.Infrastructure.Persistence.Configurations;

namespace Nexora.Infrastructure.Admin;

internal sealed class AdminOperationsService(
    NexoraDbContext db,
    UserManager<ApplicationUser> userManager,
    AuditTrail audit,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : IAdminOperationsService
{
    private const int MaxExportRows = 10_000;
    private static readonly OrderStatus[] RevenueStatuses = [OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered];
    // Peru has no daylight saving time; the IANA id works on every OS with .NET 6+.
    private static readonly TimeZoneInfo LimaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/Lima");

    // ---------- Orders ----------

    public async Task<PagedResponse<AdminOrderListItem>> ListOrdersAsync(AdminOrderListRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (page, pageSize) = Paging.Normalize(request.Page, request.PageSize);
        var rows = from order in db.Orders.AsNoTracking()
                   join user in db.Users on order.UserId equals user.Id
                   select new { order, user };

        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var pattern = Paging.ContainsPattern(request.Q);
            rows = rows.Where(row =>
                EF.Functions.ILike(row.order.OrderNumber, pattern, Paging.LikeEscape)
                || EF.Functions.ILike(row.user.Email!, pattern, Paging.LikeEscape));
        }

        if (Enum.TryParse<OrderStatus>(request.Status, ignoreCase: false, out var status))
        {
            rows = rows.Where(row => row.order.Status == status);
        }

        var total = await rows.CountAsync(cancellationToken);
        var items = await rows
            .OrderByDescending(row => row.order.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new AdminOrderListItem(
                row.order.OrderNumber,
                row.order.Status.ToString(),
                row.user.Email ?? string.Empty,
                row.user.FullName,
                row.order.CreatedAt,
                row.order.Items.Sum(item => item.Quantity),
                row.order.Total))
            .ToListAsync(cancellationToken);

        return new PagedResponse<AdminOrderListItem>(items, page, pageSize, total);
    }

    public async Task<AdminOrderDetails?> GetOrderAsync(string orderNumber, CancellationToken cancellationToken)
    {
        var row = await (from order in db.Orders.AsNoTracking().Include(order => order.Items)
                         join user in db.Users on order.UserId equals user.Id
                         where order.OrderNumber == orderNumber
                         select new { order, user.Email, user.FullName })
            .SingleOrDefaultAsync(cancellationToken);

        return row is null ? null : ToDetails(row.order, row.Email ?? string.Empty, row.FullName);
    }

    public async Task<CommandResult<AdminOrderDetails>> ChangeOrderStatusAsync(string orderNumber, string status, CancellationToken cancellationToken)
    {
        var order = await db.Orders.Include(candidate => candidate.Items)
            .SingleOrDefaultAsync(candidate => candidate.OrderNumber == orderNumber, cancellationToken);
        if (order is null)
        {
            return CommandResult.NotFound<AdminOrderDetails>();
        }

        var previous = order.Status;
        var now = timeProvider.GetUtcNow();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            switch (status)
            {
                case nameof(OrderStatus.Shipped):
                    order.MarkShipped(now);
                    break;
                case nameof(OrderStatus.Delivered):
                    order.MarkDelivered(now);
                    break;
                case nameof(OrderStatus.Cancelled):
                    order.Cancel(now);
                    await StockReservations.ReleaseAsync(db, order, cancellationToken);
                    break;
                default:
                    return CommandResult.Conflict<AdminOrderDetails>("Estado no válido.");
            }
        }
        catch (DomainException)
        {
            await transaction.RollbackAsync(cancellationToken);
            return CommandResult.Conflict<AdminOrderDetails>(
                $"No se puede pasar el pedido de {StatusLabel(previous)} a {StatusLabel(status)}.");
        }

        audit.Record("order.status_changed", "Order", order.OrderNumber, $"Pedido {order.OrderNumber}: {StatusLabel(previous)} → {StatusLabel(status)}.");

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync(cancellationToken);
            return CommandResult.Conflict<AdminOrderDetails>("El pedido cambió mientras lo editabas. Recarga la página.");
        }

        var details = await GetOrderAsync(orderNumber, cancellationToken);
        return details is null ? CommandResult.NotFound<AdminOrderDetails>() : CommandResult.Ok(details);
    }

    // ---------- Customers ----------

    public async Task<PagedResponse<AdminCustomerListItem>> ListCustomersAsync(AdminCustomerListRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (page, pageSize) = Paging.Normalize(request.Page, request.PageSize);
        var customers = db.Users.AsNoTracking()
            .Where(user => db.UserRoles.Any(role => role.UserId == user.Id && role.RoleId == RoleConfiguration.CustomerRoleId));

        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var pattern = Paging.ContainsPattern(request.Q);
            customers = customers.Where(user =>
                EF.Functions.ILike(user.Email!, pattern, Paging.LikeEscape)
                || EF.Functions.ILike(user.FullName, pattern, Paging.LikeEscape));
        }

        var total = await customers.CountAsync(cancellationToken);
        var items = await customers
            .OrderByDescending(user => user.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(user => new AdminCustomerListItem(
                user.Id,
                user.Email ?? string.Empty,
                user.FullName,
                user.CreatedAt,
                db.Orders.Count(order => order.UserId == user.Id),
                db.Orders.Where(order => order.UserId == user.Id && RevenueStatuses.Contains(order.Status)).Sum(order => (decimal?)order.Total) ?? 0m,
                db.Orders.Where(order => order.UserId == user.Id).Max(order => (DateTimeOffset?)order.CreatedAt)))
            .ToListAsync(cancellationToken);

        return new PagedResponse<AdminCustomerListItem>(items, page, pageSize, total);
    }

    // ---------- Reports ----------

    public async Task<string> ExportOrdersCsvAsync(DateOnly firstDay, DateOnly endExclusive, CancellationToken cancellationToken)
    {
        var fromUtc = ToLimaStartOfDayUtc(firstDay);
        var toUtc = ToLimaStartOfDayUtc(endExclusive);

        var rows = await (from order in db.Orders.AsNoTracking()
                          join user in db.Users on order.UserId equals user.Id
                          where order.CreatedAt >= fromUtc && order.CreatedAt < toUtc
                          orderby order.CreatedAt
                          select new
                          {
                              order.OrderNumber,
                              order.CreatedAt,
                              order.Status,
                              user.FullName,
                              user.Email,
                              order.ShippingAddress.Department,
                              Units = order.Items.Sum(item => item.Quantity),
                              order.Subtotal,
                              order.ShippingCost,
                              order.TaxableAmount,
                              order.TaxAmount,
                              order.Total,
                          })
            .Take(MaxExportRows)
            .ToListAsync(cancellationToken);

        var csv = new CsvWriter().WriteRow(
            "Pedido", "Fecha (Lima)", "Estado", "Cliente", "Correo", "Departamento", "Unidades",
            "Subtotal", "Envío", "Op. gravada", "IGV", "Total");

        foreach (var row in rows)
        {
            var limaTime = TimeZoneInfo.ConvertTime(row.CreatedAt, LimaTimeZone);
            csv.WriteRow(
                row.OrderNumber,
                limaTime.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
                StatusLabel(row.Status.ToString()),
                row.FullName,
                row.Email,
                row.Department,
                row.Units,
                row.Subtotal,
                row.ShippingCost,
                row.TaxableAmount,
                row.TaxAmount,
                row.Total);
        }

        return csv.ToString();
    }

    // ---------- Administrators ----------

    public async Task<IReadOnlyList<AdministratorResponse>> ListAdministratorsAsync(CancellationToken cancellationToken)
    {
        var admins = await userManager.GetUsersInRoleAsync(AppRoles.Admin);
        return [.. admins
            .OrderBy(admin => admin.Email, StringComparer.OrdinalIgnoreCase)
            .Select(admin => new AdministratorResponse(admin.Id, admin.Email ?? string.Empty, admin.FullName, admin.Id == currentUser.UserId))];
    }

    public async Task<CommandResult<AdministratorResponse>> GrantAdministratorAsync(string email, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return CommandResult.Conflict<AdministratorResponse>("No existe una cuenta con ese correo. La persona debe registrarse primero.");
        }

        if (await userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            return CommandResult.Conflict<AdministratorResponse>("Esa cuenta ya es administradora.");
        }

        // Staged first so Identity's own SaveChanges persists it together with the role change.
        audit.Record("admin.granted", "User", user.Id, $"Otorgó permisos de administrador a {user.Email}.");
        var result = await userManager.AddToRoleAsync(user, AppRoles.Admin);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException($"Could not grant admin role: {string.Join(", ", result.Errors.Select(error => error.Code))}");
        }

        return CommandResult.Ok(new AdministratorResponse(user.Id, user.Email ?? string.Empty, user.FullName, IsCurrentUser: false));
    }

    public async Task<CommandResult<bool>> RevokeAdministratorAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (userId == currentUser.UserId)
        {
            return CommandResult.Conflict<bool>("No puedes quitarte tus propios permisos de administrador.");
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null || !await userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            return CommandResult.NotFound<bool>();
        }

        if ((await userManager.GetUsersInRoleAsync(AppRoles.Admin)).Count <= 1)
        {
            return CommandResult.Conflict<bool>("Debe quedar al menos un administrador.");
        }

        audit.Record("admin.revoked", "User", user.Id, $"Quitó los permisos de administrador a {user.Email}.");
        var result = await userManager.RemoveFromRoleAsync(user, AppRoles.Admin);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException($"Could not revoke admin role: {string.Join(", ", result.Errors.Select(error => error.Code))}");
        }

        // Rotating the stamp ends the user's current sessions at the next validation (≤ 5 minutes),
        // so the old "Admin" claim in their cookie stops working.
        await userManager.UpdateSecurityStampAsync(user);
        return CommandResult.Ok(true);
    }

    // ---------- Helpers ----------

    private static AdminOrderDetails ToDetails(Order order, string email, string fullName) =>
        new(OrderMapping.ToResponse(order), email, fullName, order.ShippedAt, AllowedTransitions(order.Status));

    private static string[] AllowedTransitions(OrderStatus status) => status switch
    {
        OrderStatus.PendingPayment => [nameof(OrderStatus.Cancelled)],
        OrderStatus.Paid => [nameof(OrderStatus.Shipped)],
        OrderStatus.Shipped => [nameof(OrderStatus.Delivered)],
        _ => [],
    };

    private static DateTimeOffset ToLimaStartOfDayUtc(DateOnly date)
    {
        var local = date.ToDateTime(TimeOnly.MinValue);
        return new DateTimeOffset(local, LimaTimeZone.GetUtcOffset(local)).ToUniversalTime();
    }

    private static string StatusLabel(OrderStatus status) => StatusLabel(status.ToString());

    private static string StatusLabel(string status) => status switch
    {
        nameof(OrderStatus.PendingPayment) => "Pendiente de pago",
        nameof(OrderStatus.Paid) => "Pagado",
        nameof(OrderStatus.PaymentFailed) => "Pago rechazado",
        nameof(OrderStatus.Cancelled) => "Cancelado",
        nameof(OrderStatus.Shipped) => "Enviado",
        nameof(OrderStatus.Delivered) => "Entregado",
        _ => status,
    };
}
