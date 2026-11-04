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

    /// <summary>
    /// The catalog has two levels (e.g. Periféricos → Teclados): a parent must be a top-level
    /// category, which also rules out cycles.
    /// </summary>
    public void Update(string name, string slug, Category? parent, bool hasChildren)
    {
        if (parent is not null)
        {
            if (parent.Id == Id || parent.ParentId is not null)
            {
                throw new DomainException("A category can only be nested under a top-level category.");
            }

            if (hasChildren)
            {
                throw new DomainException("A category with subcategories cannot become a subcategory.");
            }
        }

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
