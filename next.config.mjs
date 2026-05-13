/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdfmake"],
  // OneDrive/Windows often locks files under `.next`, causing EBUSY when webpack reads chunk files.
  // Memory cache avoids persistent pack files that compete with sync software.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  }
};

export default nextConfig;
