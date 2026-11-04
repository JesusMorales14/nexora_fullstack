using System.ComponentModel.DataAnnotations;

namespace Nexora.Api.Configuration;

public sealed class FrontendOptions
{
    public const string SectionName = "Frontend";

    /// <summary>Public storefront URL, used to build links sent by email (e.g. password reset).</summary>
    [Required]
    [Url]
    public string BaseUrl { get; init; } = string.Empty;

    /// <summary>
    /// Browser origins allowed to call the API with credentials when the storefront is served
    /// from another origin (e.g. https://nexora.pe → https://api.nexora.pe). Empty in development,
    /// where the Vite proxy keeps everything same-origin.
    /// </summary>
    public string[] AllowedCorsOrigins { get; init; } = [];

    /// <summary>
    /// Where to read the built index.html used for server-rendered product metadata. Defaults to
    /// {BaseUrl}/index.html; set it when the HTML is served from another address (e.g. local preview).
    /// </summary>
    public string? IndexHtmlUrl { get; init; }
}
