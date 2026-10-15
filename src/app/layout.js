import "./globals.css";
import { AppProvider } from "@/context/AppContext";

export const viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "DIDIKARA — Platform Pelatihan & Sertifikasi Profesional",
  description: "Platform digital nasional terintegrasi untuk pelatihan profesional, sertifikasi, pendidikan lanjutan, dan analitik angkatan kerja berbasis AI.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "DIDIKARA" },
  openGraph: {
    title: "DIDIKARA — Platform Pelatihan & Sertifikasi Profesional",
    description: "Platform digital nasional terintegrasi untuk pelatihan profesional, sertifikasi, pendidikan lanjutan, dan analitik angkatan kerja berbasis AI.",
    url: "https://didikara.id",
    siteName: "DIDIKARA",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DIDIKARA — Platform Pelatihan & Sertifikasi Profesional",
    description: "Platform digital nasional terintegrasi untuk pelatihan profesional, sertifikasi, pendidikan lanjutan, dan analitik angkatan kerja berbasis AI.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
