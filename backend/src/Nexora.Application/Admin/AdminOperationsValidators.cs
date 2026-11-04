using FluentValidation;

namespace Nexora.Application.Admin;

public sealed class OrderStatusChangeRequestValidator : AbstractValidator<OrderStatusChangeRequest>
{
    public static readonly IReadOnlyList<string> AllowedTargets = ["Shipped", "Delivered", "Cancelled"];

    public OrderStatusChangeRequestValidator() =>
        RuleFor(request => request.Status)
            .Must(status => AllowedTargets.Contains(status))
            .WithMessage("Estado no válido.");
}

public sealed class GrantAdministratorRequestValidator : AbstractValidator<GrantAdministratorRequest>
{
    public GrantAdministratorRequestValidator() =>
        RuleFor(request => request.Email)
            .NotEmpty().WithMessage("Ingresa el correo de la cuenta.")
            .EmailAddress().WithMessage("Ingresa un correo válido.")
            .MaximumLength(254);
}
