using Microsoft.AspNetCore.Mvc;
using Nexora.Application.Common;

namespace Nexora.Api.Common;

public static class CommandResultExtensions
{
    /// <summary>Success → <paramref name="onSuccess"/>, NotFound → 404, Conflict → 409, all as Problem Details.</summary>
    public static IActionResult ToActionResult<T>(this ControllerBase controller, CommandResult<T> result, Func<T, IActionResult> onSuccess)
    {
        ArgumentNullException.ThrowIfNull(controller);
        ArgumentNullException.ThrowIfNull(result);
        ArgumentNullException.ThrowIfNull(onSuccess);

        return result.Status switch
        {
            CommandStatus.Success => onSuccess(result.Value!),
            CommandStatus.NotFound => controller.Problem(statusCode: StatusCodes.Status404NotFound, title: "Not found", detail: "El recurso no existe."),
            CommandStatus.Conflict => controller.Problem(statusCode: StatusCodes.Status409Conflict, title: "Conflict", detail: result.Error),
            _ => throw new InvalidOperationException($"Unhandled command status {result.Status}."),
        };
    }
}
