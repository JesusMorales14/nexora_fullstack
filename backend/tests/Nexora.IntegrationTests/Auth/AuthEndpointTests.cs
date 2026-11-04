using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Nexora.Api.Auth;
using Nexora.Application.Auth;

namespace Nexora.IntegrationTests.Auth;

public sealed class AuthEndpointTests(NexoraApiFactory factory)
{
    private const string ValidPassword = "una-clave-larga-y-segura";

    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    /// <summary>Tests share one database, so every test uses its own account.</summary>
    private static string UniqueEmail() => $"cliente-{Guid.NewGuid():N}@nexora.test";

    [Fact]
    public async Task RegisterSignsInAsCustomerAndLogoutEndsTheSession()
    {
        using var session = factory.CreateSession();
        var email = UniqueEmail();

        var registered = await session.RegisterAsync(email, ValidPassword, "  Ana Pérez  ");
        Assert.Equal(HttpStatusCode.Created, registered.StatusCode);

        var setCookie = string.Join(';', registered.Headers.GetValues("Set-Cookie"));
        Assert.Contains("__Host-nexora-session", setCookie, StringComparison.Ordinal);
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", setCookie, StringComparison.OrdinalIgnoreCase);

        var me = await session.Client.GetFromJsonAsync<CurrentUserResponse>(new Uri("/api/v1/auth/me", UriKind.Relative), CancellationToken);
        Assert.NotNull(me);
        Assert.Equal(email, me.Email);
        Assert.Equal("Ana Pérez", me.FullName);
        Assert.Equal([AppRoles.Customer], me.Roles);

        var logout = await session.PostAsync("/api/v1/auth/logout", new { });
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var afterLogout = await session.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, afterLogout.StatusCode);
        Assert.Equal("application/problem+json", afterLogout.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task RegisterRejectsShortPasswordsAndDuplicateEmailsPerField()
    {
        using var session = factory.CreateSession();
        var email = UniqueEmail();

        var shortPassword = await session.RegisterAsync(email, "corta");
        Assert.Equal(HttpStatusCode.BadRequest, shortPassword.StatusCode);
        var shortProblem = await shortPassword.Content.ReadFromJsonAsync<ValidationProblemDetails>(CancellationToken);
        Assert.Contains("password", shortProblem!.Errors.Keys);

        Assert.Equal(HttpStatusCode.Created, (await session.RegisterAsync(email, ValidPassword)).StatusCode);

        using var otherSession = factory.CreateSession();
        var duplicate = await otherSession.RegisterAsync(email.ToUpperInvariant(), ValidPassword);
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        var duplicateProblem = await duplicate.Content.ReadFromJsonAsync<ValidationProblemDetails>(CancellationToken);
        Assert.Equal(["Ya existe una cuenta con este correo."], duplicateProblem!.Errors["email"]);
    }

    [Fact]
    public async Task UnsafeRequestsWithoutAntiforgeryTokenAreRejected()
    {
        using var session = factory.CreateSession();

        var response = await session.PostAsync(
            "/api/v1/auth/register", new RegisterRequest { Email = UniqueEmail(), Password = ValidPassword, FullName = "Sin Token" }, includeCsrfToken: false);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task WrongPasswordAndUnknownEmailGetTheSameResponse()
    {
        using var session = factory.CreateSession();
        var email = UniqueEmail();
        await session.RegisterAsync(email, ValidPassword);
        await session.PostAsync("/api/v1/auth/logout", new { });
        await session.RefreshCsrfTokenAsync();

        var wrongPassword = await session.LoginAsync(email, "otra-clave-equivocada");
        var unknownEmail = await session.LoginAsync(UniqueEmail(), ValidPassword);

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownEmail.StatusCode);
        var wrongProblem = await wrongPassword.Content.ReadFromJsonAsync<ProblemDetails>(CancellationToken);
        var unknownProblem = await unknownEmail.Content.ReadFromJsonAsync<ProblemDetails>(CancellationToken);
        Assert.Equal(wrongProblem!.Detail, unknownProblem!.Detail);
    }

    [Fact]
    public async Task AccountLocksAfterRepeatedFailuresEvenWithTheRightPassword()
    {
        using var session = factory.CreateSession();
        var email = UniqueEmail();
        await session.RegisterAsync(email, ValidPassword);
        await session.PostAsync("/api/v1/auth/logout", new { });
        await session.RefreshCsrfTokenAsync();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await session.LoginAsync(email, "clave-incorrecta-123");
        }

        var correctPassword = await session.LoginAsync(email, ValidPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, correctPassword.StatusCode);
    }

    [Fact]
    public async Task ForgotPasswordDoesNotRevealWhetherTheEmailExists()
    {
        using var session = factory.CreateSession();
        var unknownEmail = UniqueEmail();

        var response = await session.PostAsync("/api/v1/auth/forgot-password", new ForgotPasswordRequest { Email = unknownEmail });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Null(factory.Emails.LastResetLinkFor(unknownEmail));
    }

    [Fact]
    public async Task PasswordResetFlowChangesThePasswordAndTokensAreSingleUse()
    {
        using var session = factory.CreateSession();
        var email = UniqueEmail();
        const string NewPassword = "mi-nueva-clave-segura";
        await session.RegisterAsync(email, ValidPassword);
        await session.PostAsync("/api/v1/auth/logout", new { });
        await session.RefreshCsrfTokenAsync();

        Assert.Equal(
            HttpStatusCode.Accepted,
            (await session.PostAsync("/api/v1/auth/forgot-password", new ForgotPasswordRequest { Email = email })).StatusCode);

        var link = factory.Emails.LastResetLinkFor(email);
        Assert.NotNull(link);
        Assert.StartsWith("https://nexora.test/reset-password?", link.AbsoluteUri, StringComparison.Ordinal);
        var token = QueryHelpers.ParseQuery(link.Query)["token"].ToString();

        var reset = await session.PostAsync("/api/v1/auth/reset-password", new ResetPasswordRequest { Email = email, Token = token, NewPassword = NewPassword });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        var reused = await session.PostAsync("/api/v1/auth/reset-password", new ResetPasswordRequest { Email = email, Token = token, NewPassword = "otra-clave-distinta" });
        Assert.Equal(HttpStatusCode.BadRequest, reused.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await session.LoginAsync(email, ValidPassword)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await session.LoginAsync(email, NewPassword)).StatusCode);
    }

    [Fact]
    public async Task AdminEndpointsRequireTheAdminRole()
    {
        using var anonymous = factory.CreateSession();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/admin/summary")).StatusCode);

        using var customer = factory.CreateSession();
        await customer.RegisterAsync(UniqueEmail(), ValidPassword);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/v1/admin/summary")).StatusCode);

        using var admin = factory.CreateSession();
        Assert.Equal(HttpStatusCode.OK, (await admin.LoginAsync(NexoraApiFactory.AdminEmail, factory.AdminPassword)).StatusCode);
        var summary = await admin.Client.GetFromJsonAsync<Nexora.Application.Admin.AdminSummaryResponse>(
            new Uri("/api/v1/admin/summary", UriKind.Relative), CancellationToken);
        Assert.NotNull(summary);
        // Other tests add products to the shared database: assert the seeded minimum.
        Assert.True(summary.TotalProducts >= 16);
        Assert.True(summary.PublishedProducts >= 15);
        Assert.True(summary.TotalProducts > summary.PublishedProducts);
    }

    [Fact]
    public async Task AuthEndpointsAreRateLimitedPerClient()
    {
        using var limitedFactory = factory.WithWebHostBuilder(builder => builder.UseSetting("RateLimiting:Auth:PermitLimit", "2"));
        using var session = new Support.ApiSession(limitedFactory.CreateClient(
            new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") }));

        HttpResponseMessage? last = null;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            last = await session.LoginAsync(UniqueEmail(), ValidPassword);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, last!.StatusCode);
        Assert.Equal("application/problem+json", last.Content.Headers.ContentType?.MediaType);
    }
}
