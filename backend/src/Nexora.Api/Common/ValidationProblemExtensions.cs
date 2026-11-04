using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Nexora.Api.Common;

public static class ValidationProblemExtensions
{
    /// <summary>
    /// Turns FluentValidation failures into a 400 Problem Details whose keys match the JSON the
    /// client sent, e.g. "shippingAddress.phone" or "items[0].quantity".
    /// </summary>
    public static ActionResult ToValidationProblem(this ControllerBase controller, ValidationResult result)
    {
        ArgumentNullException.ThrowIfNull(controller);
        ArgumentNullException.ThrowIfNull(result);

        var errors = new ModelStateDictionary();
        foreach (var failure in result.Errors)
        {
            errors.AddModelError(ToJsonPath(failure.PropertyName), failure.ErrorMessage);
        }

        return controller.ValidationProblem(errors);
    }

    private static string ToJsonPath(string propertyPath) =>
        string.Join('.', propertyPath.Split('.').Select(segment =>
            segment.Length == 0 ? segment : char.ToLowerInvariant(segment[0]) + segment[1..]));
}
