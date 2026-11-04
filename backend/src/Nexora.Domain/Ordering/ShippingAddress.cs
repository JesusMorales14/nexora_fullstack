using Nexora.Domain.Common;

namespace Nexora.Domain.Ordering;

/// <summary>
/// Delivery address copied into the order (a snapshot): later edits to the customer's saved
/// addresses must never change where a past order was shipped.
/// </summary>
public sealed record ShippingAddress
{
    public const int NameMaxLength = 120;
    public const int PhoneMaxLength = 20;
    public const int RegionMaxLength = 60;
    public const int AddressLineMaxLength = 200;
    public const int ReferenceMaxLength = 200;

    // Required by EF Core for materialization.
    private ShippingAddress()
    {
        RecipientName = null!;
        Phone = null!;
        Department = null!;
        Province = null!;
        District = null!;
        AddressLine = null!;
    }

    public ShippingAddress(
        string recipientName,
        string phone,
        string department,
        string province,
        string district,
        string addressLine,
        string? reference)
    {
        RecipientName = Guard.RequiredText(recipientName, NameMaxLength, "Recipient name");
        Phone = Guard.RequiredText(phone, PhoneMaxLength, "Phone");
        Department = Guard.RequiredText(department, RegionMaxLength, "Department");
        Province = Guard.RequiredText(province, RegionMaxLength, "Province");
        District = Guard.RequiredText(district, RegionMaxLength, "District");
        AddressLine = Guard.RequiredText(addressLine, AddressLineMaxLength, "Address line");
        Reference = string.IsNullOrWhiteSpace(reference) ? null : Guard.RequiredText(reference, ReferenceMaxLength, "Reference");
    }

    public string RecipientName { get; private init; }

    public string Phone { get; private init; }

    public string Department { get; private init; }

    public string Province { get; private init; }

    public string District { get; private init; }

    public string AddressLine { get; private init; }

    public string? Reference { get; private init; }
}
