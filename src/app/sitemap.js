import { query } from "@/lib/db";

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://didikara.id";

  // Static routes
  const routes = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/legal/privasi`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/legal/syarat-ketentuan`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic course routes from database
  try {
    const { rows: courses } = await query(
      "SELECT id FROM courses WHERE deleted_at IS NULL"
    );

    for (const c of courses) {
      routes.push({
        url: `${baseUrl}/kelas?courseId=${c.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // DB tidak tersedia saat static analysis → fallback ke static routes
  }

  return routes;
}
