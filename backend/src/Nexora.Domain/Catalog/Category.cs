using Nexora.Domain.Common;

namespace Nexora.Domain.Catalog;

public sealed class Category
{
    public const int NameMaxLength = 80;

    // Required by EF Core for materialization.
    private Category()
    {
        Name = null!;
        Slug = null!;
    }

    public Category(string name, string slug, Category? parent = null)
    {
        Id = Guid.CreateVersion7();
        Name = Guard.RequiredText(name, NameMaxLength, "Category name");
        Slug = Guard.Slug(slug);
        Parent = parent;
        ParentId = parent?.Id;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    public string Slug { get; private set; }

    public Guid? ParentId { get; private set; }

    public Category? Parent { get; private set; }
}
