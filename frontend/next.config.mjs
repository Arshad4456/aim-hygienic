function normalizeProxyBase(rawApiBase) {
  const apiBase = (rawApiBase || "http://localhost:5000").trim().replace(/\/$/, "");
  return apiBase.replace(/\/api$/i, "");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = normalizeProxyBase(process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE);

    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
