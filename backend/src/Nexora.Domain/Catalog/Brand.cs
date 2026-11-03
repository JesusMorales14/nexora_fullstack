using Nexora.Domain.Common;

namespace Nexora.Domain.Catalog;

public sealed class Brand
{
    public const int NameMaxLength = 80;

    // Required by EF Core for materialization.
    private Brand()
    {
        Name = null!;
        Slug = null!;
    }

    public Brand(string name, string slug)
    {
        Id = Guid.CreateVersion7();
        Name = Guard.RequiredText(name, NameMaxLength, "Brand name");
        Slug = Guard.Slug(slug);
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    public string Slug { get; private set; }
}
