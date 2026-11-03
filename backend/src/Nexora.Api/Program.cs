using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Nexora.Api.Auth;
using Nexora.Api.Configuration;
using Nexora.Infrastructure;
using Nexora.Infrastructure.Persistence;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    // CSRF defense for cookie auth: every POST/PUT/PATCH/DELETE must carry a valid antiforgery token.
    options.Filters.Add<AntiforgeryValidationFilter>();
    // Validation error keys use the JSON (camelCase) names the client sends, e.g. "password".
    options.ModelMetadataDetailsProviders.Add(new SystemTextJsonValidationMetadataProvider());
});
builder.Services.AddOpenApi();

// RFC 9457 Problem Details for every error response (validation, 404, unhandled exceptions).
// The traceId lets support correlate a user-visible error with the server logs.
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
});

builder.Services.AddOptions<FrontendOptions>()
    .BindConfiguration(FrontendOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddInfrastructure();
builder.Services.AddNexoraAuth(builder.Configuration, builder.Environment);

builder.Services.AddHealthChecks()
    .AddDbContextCheck<NexoraDbContext>("database");

var app = builder.Build();

// Unhandled exceptions become a generic 500 Problem Details: no stack traces leak to clients.
app.UseExceptionHandler();
// Empty 4xx responses (unknown routes, 401/403, antiforgery failures) get a Problem Details body.
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    await app.Services.InitializeDatabaseAsync(seedSampleData: true);
}

app.UseCors(AuthSetup.CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapHealthChecks("/health");
app.MapControllers();

await app.RunAsync();

/// <summary>Exposed so integration tests can boot the API with WebApplicationFactory.</summary>
public partial class Program;
