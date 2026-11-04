using Nexora.Application.Checkout;

namespace Nexora.UnitTests.Ordering;

public sealed class CheckoutValidatorTests
{
    private readonly CheckoutRequestValidator _validator = new();

    private static ShippingAddressRequest ValidAddress() => new()
    {
        RecipientName = "Ana Pérez",
        Phone = "987654321",
        Department = "Lima",
        Province = "Lima",
        District = "Miraflores",
        AddressLine = "Av. Larco 123",
    };

    [Fact]
    public void ValidRequestPasses()
    {
        var request = new CheckoutRequest
        {
            Items = [new CartItemRequest { VariantId = Guid.NewGuid(), Quantity = 2 }],
            ShippingAddress = ValidAddress(),
        };

        Assert.True(_validator.Validate(request).IsValid);
    }

    [Fact]
    public void RejectsEmptyCartsDuplicatesAndBadQuantities()
    {
        var variantId = Guid.NewGuid();

        var empty = _validator.Validate(new CheckoutRequest { Items = [], ShippingAddress = ValidAddress() });
        var duplicated = _validator.Validate(new CheckoutRequest
        {
            Items = [new CartItemRequest { VariantId = variantId, Quantity = 1 }, new CartItemRequest { VariantId = variantId, Quantity = 1 }],
            ShippingAddress = ValidAddress(),
        });
        var tooMany = _validator.Validate(new CheckoutRequest
        {
            Items = [new CartItemRequest { VariantId = variantId, Quantity = 11 }],
            ShippingAddress = ValidAddress(),
        });

        Assert.Contains(empty.Errors, error => error.PropertyName == "Items");
        Assert.Contains(duplicated.Errors, error => error.PropertyName == "Items");
        Assert.Contains(tooMany.Errors, error => error.PropertyName == "Items[0].Quantity");
    }

    [Theory]
    [InlineData("12345678")]
    [InlineData("812345678")]
    [InlineData("9876543210")]
    [InlineData("98765432a")]
    public void RejectsPhonesThatAreNotPeruvianMobiles(string phone)
    {
        var address = ValidAddress();
        var request = new CheckoutRequest
        {
            Items = [new CartItemRequest { VariantId = Guid.NewGuid(), Quantity = 1 }],
            ShippingAddress = new ShippingAddressRequest
            {
                RecipientName = address.RecipientName,
                Phone = phone,
                Department = address.Department,
                Province = address.Province,
                District = address.District,
                AddressLine = address.AddressLine,
            },
        };

        Assert.Contains(_validator.Validate(request).Errors, error => error.PropertyName == "ShippingAddress.Phone");
    }

    [Fact]
    public void RejectsUnknownDepartments()
    {
        var validator = new CartQuoteRequestValidator();

        var result = validator.Validate(new CartQuoteRequest
        {
            Items = [new CartItemRequest { VariantId = Guid.NewGuid(), Quantity = 1 }],
            Department = "Atlantis",
        });

        Assert.Contains(result.Errors, error => error.PropertyName == "Department");
    }
}
