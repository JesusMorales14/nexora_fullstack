namespace Nexora.Application.Admin;

public sealed record AdminSummaryResponse(
    int TotalProducts,
    int PublishedProducts,
    int LowStockVariants,
    int OutOfStockVariants,
    int Customers);

public interface IAdminDashboard
{
    Task<AdminSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken);
}
