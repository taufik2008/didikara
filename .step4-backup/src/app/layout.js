import "./globals.css";
import { AppProvider } from "@/context/AppContext";

export const metadata = {
  title: "NHCIE Learning Platform",
  description: "Platform digital nasional terintegrasi untuk pelatihan profesional, sertifikasi, pendidikan lanjutan, dan analitik angkatan kerja berbasis AI.",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "NHCIE LMS" },
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
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
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
