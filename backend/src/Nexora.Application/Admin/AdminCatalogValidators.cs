using FluentValidation;
using Nexora.Domain.Catalog;
using Nexora.Domain.Common;

namespace Nexora.Application.Admin;

// Same limits as the domain invariants, but with field-level Spanish messages for the admin UI.

internal static class CatalogRules
{
    public const int MaxStockAdjustment = 10_000;
    public const int MaxImageDimension = 10_000;

    public static IRuleBuilderOptions<T, string> ValidSlug<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Ingresa un slug.")
            .MaximumLength(Guard.SlugMaxLength)
            .Must(Guard.IsValidSlug).WithMessage("Usa solo minúsculas, números y guiones (ej. mouse-gamer-rgb).");

    public static IRuleBuilderOptions<T, decimal> ValidPrice<T>(this IRuleBuilder<T, decimal> rule) =>
        rule.GreaterThan(0).WithMessage("El precio debe ser mayor a 0.")
            .LessThanOrEqualTo(Price.MaxAmount).WithMessage($"El precio no puede superar {Price.MaxAmount}.")
            .Must(price => decimal.Round(price, Price.Scale) == price).WithMessage("Usa como máximo 2 decimales.");
}

public sealed class ProductVariantInputValidator : AbstractValidator<ProductVariantInput>
{
    public ProductVariantInputValidator()
    {
        RuleFor(variant => variant.Sku)
            .NotEmpty().WithMessage("Ingresa el SKU.")
            .MaximumLength(ProductVariant.SkuMaxLength)
            .Matches("^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$").WithMessage("El SKU admite letras, números y guiones.");
        RuleFor(variant => variant.Name).NotEmpty().WithMessage("Ingresa el nombre de la variante.").MaximumLength(ProductVariant.NameMaxLength);
        RuleFor(variant => variant.Price).ValidPrice();
        RuleFor(variant => variant.CompareAtPrice)
            .Must((variant, compareAt) => compareAt is null || compareAt > variant.Price)
            .WithMessage("El precio anterior debe ser mayor que el precio.");
        RuleFor(variant => variant.InitialStock).InclusiveBetween(0, CatalogRules.MaxStockAdjustment);
        RuleFor(variant => variant.LowStockThreshold).InclusiveBetween(0, 1_000);
    }
}

public sealed class ProductImageInputValidator : AbstractValidator<ProductImageInput>
{
    public ProductImageInputValidator()
    {
        RuleFor(image => image.Url)
            .NotEmpty().WithMessage("Ingresa la URL de la imagen.")
            .MaximumLength(ProductImage.UrlMaxLength)
            .Must(url => (url.StartsWith('/') && !url.StartsWith("//", StringComparison.Ordinal))
                || (Uri.TryCreate(url, UriKind.Absolute, out var absolute) && absolute.Scheme == Uri.UriSchemeHttps))
            .WithMessage("Usa una ruta del sitio (/images/...) o una URL https://.");
        RuleFor(image => image.AltText)
            .NotEmpty().WithMessage("Describe la imagen (texto alternativo).")
            .MaximumLength(ProductImage.AltTextMaxLength);
        RuleFor(image => image.Width).InclusiveBetween(1, CatalogRules.MaxImageDimension);
        RuleFor(image => image.Height).InclusiveBetween(1, CatalogRules.MaxImageDimension);
    }
}

public sealed class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(product => product.Name).NotEmpty().WithMessage("Ingresa el nombre.").MaximumLength(Product.NameMaxLength);
        RuleFor(product => product.Slug).ValidSlug();
        RuleFor(product => product.Description).NotEmpty().WithMessage("Ingresa una descripción.").MaximumLength(Product.DescriptionMaxLength);
        RuleFor(product => product.CategoryId).NotEmpty().WithMessage("Selecciona una categoría.");
        RuleFor(product => product.BrandId).NotEmpty().WithMessage("Selecciona una marca.");
        RuleFor(product => product.Variant).NotNull().SetValidator(new ProductVariantInputValidator());
        RuleFor(product => product.Image!).SetValidator(new ProductImageInputValidator()).When(product => product.Image is not null);
    }
}

public sealed class UpdateProductRequestValidator : AbstractValidator<UpdateProductRequest>
{
    public UpdateProductRequestValidator()
    {
        RuleFor(product => product.Name).NotEmpty().WithMessage("Ingresa el nombre.").MaximumLength(Product.NameMaxLength);
        RuleFor(product => product.Slug).ValidSlug();
        RuleFor(product => product.Description).NotEmpty().WithMessage("Ingresa una descripción.").MaximumLength(Product.DescriptionMaxLength);
        RuleFor(product => product.CategoryId).NotEmpty().WithMessage("Selecciona una categoría.");
        RuleFor(product => product.BrandId).NotEmpty().WithMessage("Selecciona una marca.");
    }
}

public sealed class UpdateVariantRequestValidator : AbstractValidator<UpdateVariantRequest>
{
    public UpdateVariantRequestValidator()
    {
        RuleFor(variant => variant.Name).NotEmpty().WithMessage("Ingresa el nombre de la variante.").MaximumLength(ProductVariant.NameMaxLength);
        RuleFor(variant => variant.Price).ValidPrice();
        RuleFor(variant => variant.CompareAtPrice)
            .Must((variant, compareAt) => compareAt is null || compareAt > variant.Price)
            .WithMessage("El precio anterior debe ser mayor que el precio.");
        RuleFor(variant => variant.LowStockThreshold).InclusiveBetween(0, 1_000);
    }
}

public sealed class CategoryRequestValidator : AbstractValidator<CategoryRequest>
{
    public CategoryRequestValidator()
    {
        RuleFor(category => category.Name).NotEmpty().WithMessage("Ingresa el nombre.").MaximumLength(Category.NameMaxLength);
        RuleFor(category => category.Slug).ValidSlug();
    }
}

public sealed class BrandRequestValidator : AbstractValidator<BrandRequest>
{
    public BrandRequestValidator()
    {
        RuleFor(brand => brand.Name).NotEmpty().WithMessage("Ingresa el nombre.").MaximumLength(Brand.NameMaxLength);
        RuleFor(brand => brand.Slug).ValidSlug();
    }
}

public sealed class InventoryAdjustmentRequestValidator : AbstractValidator<InventoryAdjustmentRequest>
{
    public InventoryAdjustmentRequestValidator()
    {
        RuleFor(adjustment => adjustment.QuantityChange)
            .NotEqual(0).WithMessage("La cantidad no puede ser 0.")
            .InclusiveBetween(-CatalogRules.MaxStockAdjustment, CatalogRules.MaxStockAdjustment);
        RuleFor(adjustment => adjustment.Reason)
            .IsInEnum()
            // Sales are recorded only by checkout, never typed in by hand.
            .NotEqual(InventoryMovementReason.Sale).WithMessage("Selecciona un motivo válido.");
        RuleFor(adjustment => adjustment.Note).MaximumLength(InventoryMovement.NoteMaxLength);
        RuleFor(adjustment => adjustment.Note)
            .NotEmpty().WithMessage("Explica el motivo de la corrección.")
            .When(adjustment => adjustment.Reason is InventoryMovementReason.Correction or InventoryMovementReason.Damage);
    }
}
