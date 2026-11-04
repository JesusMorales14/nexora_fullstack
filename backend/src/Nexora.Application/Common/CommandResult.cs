namespace Nexora.Application.Common;

public enum CommandStatus
{
    Success,
    NotFound,

    /// <summary>Business conflict: stale version, duplicate slug, record still in use, not enough stock...</summary>
    Conflict,
}

/// <summary>Outcome of a write operation, mapped by the API to 200/201, 404 or 409.</summary>
public sealed record CommandResult<T>(CommandStatus Status, T? Value, string? Error);

/// <summary>Factories (non-generic class so call sites can rely on type inference).</summary>
public static class CommandResult
{
    public static CommandResult<T> Ok<T>(T value) => new(CommandStatus.Success, value, null);

    public static CommandResult<T> NotFound<T>() => new(CommandStatus.NotFound, default, null);

    public static CommandResult<T> Conflict<T>(string error) => new(CommandStatus.Conflict, default, error);
}

/// <summary>The authenticated user performing an operation (for audit and ownership).</summary>
public interface ICurrentUser
{
    Guid UserId { get; }

    string Email { get; }
}
