export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://didikara.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/marketplace", "/legal/", "/verify/"],
        disallow: ["/admin", "/api/", "/dashboard"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
