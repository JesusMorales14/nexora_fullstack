using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace Nexora.Api.Configuration;

/// <summary>
/// Trust X-Forwarded-For / X-Forwarded-Proto only from the reverse proxies listed in configuration
/// (ReverseProxy:KnownProxies = IPs, ReverseProxy:KnownNetworks = CIDR ranges). Without them the
/// API would rate-limit every client as the proxy's IP and could not tell that the browser used HTTPS.
/// Loopback is trusted by default; nothing else is, so clients cannot spoof their IP.
/// </summary>
public static class ReverseProxySetup
{
    public const string SectionName = "ReverseProxy";

    public static IServiceCollection AddReverseProxySupport(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection(SectionName);
        var proxies = section.GetSection("KnownProxies").Get<string[]>() ?? [];
        var networks = section.GetSection("KnownNetworks").Get<string[]>() ?? [];

        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            // Exactly one proxy hop in front of the API.
            options.ForwardLimit = 1;

            foreach (var proxy in proxies)
            {
                options.KnownProxies.Add(IPAddress.Parse(proxy));
            }

            foreach (var network in networks)
            {
                options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
            }
        });

        return services;
    }
}
