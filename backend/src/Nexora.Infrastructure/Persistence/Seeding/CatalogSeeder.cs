using Microsoft.EntityFrameworkCore;
using Nexora.Domain.Catalog;

namespace Nexora.Infrastructure.Persistence.Seeding;

/// <summary>
/// Demo catalog for local development and tests. Prices are illustrative PEN amounts,
/// IGV included. Images are local placeholders served by the frontend.
/// </summary>
public static class CatalogSeeder
{
    private const int ImageSize = 800;

    public static async Task SeedAsync(NexoraDbContext db, TimeProvider timeProvider, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        ArgumentNullException.ThrowIfNull(timeProvider);

        if (await db.Categories.AnyAsync(cancellationToken))
        {
            return;
        }

        var now = timeProvider.GetUtcNow();

        var computers = new Category("Computadoras", "computadoras");
        var laptops = new Category("Laptops", "laptops", computers);
        var monitors = new Category("Monitores", "monitores", computers);
        var peripherals = new Category("Periféricos", "perifericos");
        var keyboards = new Category("Teclados", "teclados", peripherals);
        var mice = new Category("Mouse", "mouse", peripherals);
        var audio = new Category("Audio", "audio");
        var smartphones = new Category("Smartphones", "smartphones");

        var lenovo = new Brand("Lenovo", "lenovo");
        var asus = new Brand("ASUS", "asus");
        var hp = new Brand("HP", "hp");
        var lg = new Brand("LG", "lg");
        var samsung = new Brand("Samsung", "samsung");
        var logitech = new Brand("Logitech", "logitech");
        var redragon = new Brand("Redragon", "redragon");
        var sony = new Brand("Sony", "sony");

        db.Categories.AddRange(computers, laptops, monitors, peripherals, keyboards, mice, audio, smartphones);
        db.Brands.AddRange(lenovo, asus, hp, lg, samsung, logitech, redragon, sony);

        Product Create(string name, string slug, string description, Category category, Brand brand, string image, bool isFeatured = false)
        {
            var product = new Product(name, slug, description, category, brand, now);
            product.AddImage($"/images/products/{image}.svg", name, ImageSize, ImageSize);
            product.SetFeatured(isFeatured, now);
            db.Products.Add(product);
            return product;
        }

        var ideapad = Create("Lenovo IdeaPad Slim 3 15\"", "lenovo-ideapad-slim-3-15",
            "Laptop ligera de 15,6\" para estudio y trabajo, con pantalla Full HD y batería para toda la jornada.",
            laptops, lenovo, "laptop");
        ideapad.AddVariant("LEN-IPS3-R5-16-512", "Ryzen 5 / 16 GB / 512 GB", 2499.00m, 2899.00m, initialStock: 12);
        ideapad.AddVariant("LEN-IPS3-R7-16-1TB", "Ryzen 7 / 16 GB / 1 TB", 3199.00m, initialStock: 4);

        var vivobook = Create("ASUS Vivobook 16", "asus-vivobook-16",
            "Pantalla de 16\" con relación 16:10, teclado completo y almacenamiento SSD rápido.",
            laptops, asus, "laptop", isFeatured: true);
        vivobook.AddVariant("ASU-VB16-I5-16-512", "Core i5 / 16 GB / 512 GB", 2799.00m, initialStock: 8);

        var victus = Create("HP Victus 15 Gaming", "hp-victus-15-gaming",
            "Laptop gamer con gráficos dedicados, pantalla de 144 Hz y refrigeración mejorada.",
            laptops, hp, "laptop", isFeatured: true);
        victus.AddVariant("HP-VIC15-I5-4050-16", "Core i5 / RTX 4050 / 16 GB", 4299.00m, 4799.00m, initialStock: 3);

        var strix = Create("ASUS ROG Strix G16", "asus-rog-strix-g16",
            "Alto rendimiento para juegos y creación de contenido, con pantalla QHD de 240 Hz.",
            laptops, asus, "laptop");
        strix.AddVariant("ASU-ROG-G16-I9-4070-32", "Core i9 / RTX 4070 / 32 GB", 8999.00m, initialStock: 0);

        var ultragear = Create("LG UltraGear 27\" QHD 180 Hz", "lg-ultragear-27-qhd",
            "Monitor gamer IPS QHD con 180 Hz y 1 ms, compatible con tecnologías de sincronización adaptativa.",
            monitors, lg, "monitor", isFeatured: true);
        ultragear.AddVariant("LG-27GS-QHD-180", "27\" QHD", 1199.00m, 1399.00m, initialStock: 15);

        var odyssey = Create("Samsung Odyssey G5 32\" curvo", "samsung-odyssey-g5-32",
            "Monitor curvo 1000R de 32\" QHD para una experiencia inmersiva.",
            monitors, samsung, "monitor");
        odyssey.AddVariant("SAM-ODG5-32-QHD", "32\" QHD curvo", 1499.00m, initialStock: 6);

        var lg4k = Create("LG 27\" 4K IPS", "lg-27-4k-ips",
            "Monitor 4K UHD con panel IPS y amplia cobertura de color, ideal para diseño y edición.",
            monitors, lg, "monitor");
        lg4k.AddVariant("LG-27UP-4K-IPS", "27\" 4K", 1699.00m, initialStock: 2);

        var mxKeys = Create("Logitech MX Keys S", "logitech-mx-keys-s",
            "Teclado inalámbrico de perfil bajo con retroiluminación inteligente y conexión multidispositivo.",
            keyboards, logitech, "keyboard");
        mxKeys.AddVariant("LOG-MXKS-GRAF", "Grafito", 549.00m, initialStock: 20);
        mxKeys.AddVariant("LOG-MXKS-GRIS", "Gris pálido", 549.00m, initialStock: 0);

        var kumara = Create("Redragon Kumara K552", "redragon-kumara-k552",
            "Teclado mecánico TKL con retroiluminación y construcción metálica.",
            keyboards, redragon, "keyboard");
        kumara.AddVariant("RED-K552-RED", "Switch Red", 189.00m, initialStock: 30);
        kumara.AddVariant("RED-K552-BLUE", "Switch Blue", 189.00m, initialStock: 14);

        var mxMaster = Create("Logitech MX Master 3S", "logitech-mx-master-3s",
            "Mouse ergonómico silencioso con sensor de 8000 DPI y rueda MagSpeed.",
            mice, logitech, "mouse", isFeatured: true);
        mxMaster.AddVariant("LOG-MXM3S-GRAF", "Grafito", 449.00m, 499.00m, initialStock: 25);

        var g305 = Create("Logitech G305 Lightspeed", "logitech-g305-lightspeed",
            "Mouse gamer inalámbrico ligero con sensor HERO y hasta 250 horas de batería.",
            mice, logitech, "mouse");
        g305.AddVariant("LOG-G305-BLK", "Negro", 159.00m, initialStock: 40);
        g305.AddVariant("LOG-G305-WHT", "Blanco", 169.00m, initialStock: 3);

        var sonyXm5 = Create("Sony WH-1000XM5", "sony-wh-1000xm5",
            "Audífonos inalámbricos con cancelación de ruido líder y hasta 30 horas de batería.",
            audio, sony, "headphones", isFeatured: true);
        sonyXm5.AddVariant("SON-XM5-BLK", "Negro", 1399.00m, 1699.00m, initialStock: 7);
        sonyXm5.AddVariant("SON-XM5-SLV", "Plata", 1399.00m, 1699.00m, initialStock: 2);

        var g435 = Create("Logitech G435 Lightspeed", "logitech-g435-lightspeed",
            "Audífonos gamer inalámbricos ultraligeros con Bluetooth y Lightspeed.",
            audio, logitech, "headphones");
        g435.AddVariant("LOG-G435-BLK", "Negro", 299.00m, initialStock: 10);

        var galaxyA = Create("Samsung Galaxy A56 5G", "samsung-galaxy-a56-5g",
            "Smartphone 5G con pantalla Super AMOLED de 120 Hz y cámara principal de 50 MP.",
            smartphones, samsung, "phone");
        galaxyA.AddVariant("SAM-A56-8-256", "8 GB / 256 GB", 1599.00m, initialStock: 9);

        var galaxyS = Create("Samsung Galaxy S25", "samsung-galaxy-s25",
            "Flagship compacto con procesador de última generación y funciones de IA integradas.",
            smartphones, samsung, "phone", isFeatured: true);
        galaxyS.AddVariant("SAM-S25-12-256", "12 GB / 256 GB", 3699.00m, 4199.00m, initialStock: 5);
        galaxyS.AddVariant("SAM-S25-12-512", "12 GB / 512 GB", 4199.00m, initialStock: 1);

        foreach (var product in db.Products.Local)
        {
            product.Publish(now);
        }

        // Intentionally left unpublished: proves the storefront hides drafts.
        var draft = Create("Lenovo Legion Pro 7 (borrador)", "lenovo-legion-pro-7",
            "Producto en preparación; aún no visible en la tienda.",
            laptops, lenovo, "laptop");
        draft.AddVariant("LEN-LEG7-DRAFT", "Core i9 / RTX 4080 / 32 GB", 11999.00m, initialStock: 2);

        await db.SaveChangesAsync(cancellationToken);
    }
}
