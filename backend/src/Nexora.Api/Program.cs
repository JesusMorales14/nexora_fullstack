using Nexora.Infrastructure;
using Nexora.Infrastructure.Persistence;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// RFC 9457 Problem Details for every error response (validation, 404, unhandled exceptions).
// The traceId lets support correlate a user-visible error with the server logs.
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
});

builder.Services.AddInfrastructure();

builder.Services.AddHealthChecks()
    .AddDbContextCheck<NexoraDbContext>("database");

var app = builder.Build();

// Unhandled exceptions become a generic 500 Problem Details: no stack traces leak to clients.
app.UseExceptionHandler();
// Empty 4xx responses (e.g. unknown routes) also get a Problem Details body.
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    await app.Services.InitializeDatabaseAsync(seedSampleData: true);
}

app.MapHealthChecks("/health");
app.MapControllers();

await app.RunAsync();

/// <summary>Exposed so integration tests can boot the API with WebApplicationFactory.</summary>
public partial class Program;
