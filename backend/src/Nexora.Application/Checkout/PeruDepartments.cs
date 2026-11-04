namespace Nexora.Application.Checkout;

/// <summary>Peru's 24 departments plus the Constitutional Province of Callao.</summary>
public static class PeruDepartments
{
    public static readonly IReadOnlyList<string> All =
    [
        "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao", "Cusco",
        "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima", "Loreto",
        "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
    ];

    private static readonly HashSet<string> Lookup = new(All, StringComparer.Ordinal);

    public static bool IsValid(string? department) => department is not null && Lookup.Contains(department);
}
