using System.Text.RegularExpressions;

namespace Nexora.Domain.Common;

/// <summary>Small set of reusable invariant checks shared by the entities.</summary>
public static partial class Guard
{
    public const int SlugMaxLength = 120;

    /// <summary>Returns the trimmed value or throws if it is empty or longer than <paramref name="maxLength"/>.</summary>
    public static string RequiredText(string? value, int maxLength, string fieldName)
    {
        var trimmed = value?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            throw new DomainException($"{fieldName} is required.");
        }

        if (trimmed.Length > maxLength)
        {
            throw new DomainException($"{fieldName} must be at most {maxLength} characters.");
        }

        return trimmed;
    }

    /// <summary>Slugs are stable public URLs: lowercase ASCII words separated by single hyphens.</summary>
    public static string Slug(string? value)
    {
        var slug = RequiredText(value, SlugMaxLength, "Slug");

        if (!SlugPattern().IsMatch(slug))
        {
            throw new DomainException($"Slug '{slug}' must contain only lowercase letters, digits and single hyphens.");
        }

        return slug;
    }

    public static bool IsValidSlug(string? value) =>
        !string.IsNullOrEmpty(value) && value.Length <= SlugMaxLength && SlugPattern().IsMatch(value);

    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.CultureInvariant)]
    private static partial Regex SlugPattern();
}
