function normalizeProxyBase(rawApiBase) {
  const value = String(rawApiBase || "").trim();
  if (!value) return "";
  return value.replace(/\/$/, "").replace(/\/api$/i, "");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = normalizeProxyBase(process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE);

    // If API_BASE is not set, do not rewrite and let infrastructure-level /api proxy handle requests.
    if (!apiBase) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;