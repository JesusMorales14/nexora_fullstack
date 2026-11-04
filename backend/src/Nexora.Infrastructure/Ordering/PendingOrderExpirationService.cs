using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nexora.Application.Checkout;

namespace Nexora.Infrastructure.Ordering;

/// <summary>
/// Periodically cancels unpaid orders whose payment window is over so their reserved stock
/// goes back on sale. Safe to run on several instances: each order update is guarded by
/// optimistic concurrency.
/// </summary>
internal sealed partial class PendingOrderExpirationService(
    IServiceScopeFactory scopeFactory,
    IOptions<PaymentOptions> options,
    ILogger<PendingOrderExpirationService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.ExpirationSweepEnabled)
        {
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(options.Value.ExpirationSweepIntervalSeconds));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var checkout = scope.ServiceProvider.GetRequiredService<ICheckoutService>();
                var expired = await checkout.ExpireStalePendingOrdersAsync(stoppingToken);

                if (expired > 0)
                {
                    LogExpired(logger, expired);
                }
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                // A failed sweep must not stop the service; the next tick retries.
                LogSweepFailed(logger, exception);
            }
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Expired {Count} unpaid orders and released their stock")]
    private static partial void LogExpired(ILogger logger, int count);

    [LoggerMessage(Level = LogLevel.Error, Message = "Pending order expiration sweep failed")]
    private static partial void LogSweepFailed(ILogger logger, Exception exception);
}
