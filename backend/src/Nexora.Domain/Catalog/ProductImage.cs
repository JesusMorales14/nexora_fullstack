using Nexora.Domain.Common;

namespace Nexora.Domain.Catalog;

public sealed class ProductImage
{
    public const int UrlMaxLength = 500;
    public const int AltTextMaxLength = 200;

    // Required by EF Core for materialization.
    private ProductImage()
    {
        Url = null!;
        AltText = null!;
    }

    internal ProductImage(Guid productId, string url, string altText, int width, int height, int sortOrder)
    {
        if (width <= 0 || height <= 0)
        {
            // Dimensions are mandatory: the storefront reserves space with them to avoid layout shift (CLS).
            throw new DomainException("Image width and height must be positive.");
        }

        Id = Guid.CreateVersion7();
        ProductId = productId;
        Url = ValidateUrl(url);
        AltText = Guard.RequiredText(altText, AltTextMaxLength, "Image alt text");
        Width = width;
        Height = height;
        SortOrder = sortOrder;
    }

    public Guid Id { get; private set; }

    public Guid ProductId { get; private set; }

    public string Url { get; private set; }

    public string AltText { get; private set; }

    public int Width { get; private set; }

    public int Height { get; private set; }

    public int SortOrder { get; private set; }

    private static string ValidateUrl(string url)
    {
        var value = Guard.RequiredText(url, UrlMaxLength, "Image URL");

        var isSiteRelative = value.StartsWith('/') && !value.StartsWith("//", StringComparison.Ordinal);
        var isHttpsAbsolute = Uri.TryCreate(value, UriKind.Absolute, out var absolute) && absolute.Scheme == Uri.UriSchemeHttps;

        if (!isSiteRelative && !isHttpsAbsolute)
        {
            throw new DomainException("Image URL must be a site-relative path or an absolute HTTPS URL.");
        }

        return value;
    }
}
