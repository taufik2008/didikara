/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["nodemailer", "web-push"],
  experimental: {
    serverActions: {
      bodySizeLimit: "1000mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/v1/create-qr-code/**",
      },
    ],
  },
};

export default nextConfig;
