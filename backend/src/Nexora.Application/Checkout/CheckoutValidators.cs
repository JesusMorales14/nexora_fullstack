using FluentValidation;
using Nexora.Domain.Ordering;

namespace Nexora.Application.Checkout;

// FluentValidation earns its place here: nested objects and collections with cross-item rules
// would be verbose and error-prone with DataAnnotations (see ADR-0006).

public sealed class CartItemRequestValidator : AbstractValidator<CartItemRequest>
{
    public CartItemRequestValidator()
    {
        RuleFor(item => item.VariantId).NotEmpty().WithMessage("Producto no válido.");
        RuleFor(item => item.Quantity)
            .InclusiveBetween(1, OrderItem.MaxQuantity)
            .WithMessage($"La cantidad debe estar entre 1 y {OrderItem.MaxQuantity}.");
    }
}

internal static class CartItemsRules
{
    public const int MaxLines = 20;

    public static void Apply<T>(IRuleBuilderInitial<T, IReadOnlyList<CartItemRequest>> rule) =>
        rule
            .NotEmpty().WithMessage("El carrito está vacío.")
            .Must(items => items.Count <= MaxLines).WithMessage($"El carrito admite como máximo {MaxLines} productos distintos.")
            .Must(items => items.Select(item => item.VariantId).Distinct().Count() == items.Count)
            .WithMessage("Hay productos repetidos en el carrito.");
}

public sealed class CartQuoteRequestValidator : AbstractValidator<CartQuoteRequest>
{
    public CartQuoteRequestValidator()
    {
        CartItemsRules.Apply(RuleFor(request => request.Items));
        RuleForEach(request => request.Items).SetValidator(new CartItemRequestValidator());
        RuleFor(request => request.Department)
            .Must(PeruDepartments.IsValid).When(request => request.Department is not null)
            .WithMessage("Departamento no válido.");
    }
}

public sealed class ShippingAddressRequestValidator : AbstractValidator<ShippingAddressRequest>
{
    public ShippingAddressRequestValidator()
    {
        RuleFor(address => address.RecipientName)
            .NotEmpty().WithMessage("Ingresa el nombre de quien recibe.")
            .MaximumLength(ShippingAddress.NameMaxLength);
        RuleFor(address => address.Phone)
            .NotEmpty().WithMessage("Ingresa un celular de contacto.")
            .Matches("^9[0-9]{8}$").WithMessage("Ingresa un celular peruano de 9 dígitos que empiece con 9.");
        RuleFor(address => address.Department)
            .Must(PeruDepartments.IsValid).WithMessage("Selecciona un departamento.");
        RuleFor(address => address.Province)
            .NotEmpty().WithMessage("Ingresa la provincia.")
            .MaximumLength(ShippingAddress.RegionMaxLength);
        RuleFor(address => address.District)
            .NotEmpty().WithMessage("Ingresa el distrito.")
            .MaximumLength(ShippingAddress.RegionMaxLength);
        RuleFor(address => address.AddressLine)
            .NotEmpty().WithMessage("Ingresa la dirección.")
            .MaximumLength(ShippingAddress.AddressLineMaxLength);
        RuleFor(address => address.Reference).MaximumLength(ShippingAddress.ReferenceMaxLength);
    }
}

public sealed class CheckoutRequestValidator : AbstractValidator<CheckoutRequest>
{
    public CheckoutRequestValidator()
    {
        CartItemsRules.Apply(RuleFor(request => request.Items));
        RuleForEach(request => request.Items).SetValidator(new CartItemRequestValidator());
        RuleFor(request => request.ShippingAddress).NotNull().SetValidator(new ShippingAddressRequestValidator());
    }
}
