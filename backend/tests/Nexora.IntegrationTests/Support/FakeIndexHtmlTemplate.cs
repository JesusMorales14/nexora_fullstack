using Nexora.Api.Seo;

namespace Nexora.IntegrationTests.Support;

/// <summary>Stand-in for the built storefront index.html (tests have no frontend server).</summary>
public sealed class FakeIndexHtmlTemplate : IIndexHtmlTemplate
{
    public const string Html = """
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <meta name="description" content="Tienda de tecnología" />
            <title>Nexora</title>
          </head>
          <body><div id="root"></div></body>
        </html>
        """;

    public Task<string> GetAsync(CancellationToken cancellationToken) => Task.FromResult(Html);
}
