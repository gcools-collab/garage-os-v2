import type { NextConfig } from "next";

type ImageRemotePattern = {
  readonly protocol: "http" | "https"
  readonly hostname: string
  readonly pathname?: string
}

function supabaseStoragePatterns(): ImageRemotePattern[] {
  const patterns: ImageRemotePattern[] = [
    { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    { protocol: "https", hostname: "*.supabase.in", pathname: "/storage/v1/object/public/**" },
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!supabaseUrl) return patterns

  try {
    const parsed = new URL(supabaseUrl)
    const protocol = parsed.protocol.replace(":", "")
    if (protocol !== "http" && protocol !== "https") return patterns
    patterns.unshift({
      protocol,
      hostname: parsed.hostname,
      pathname: "/storage/v1/object/public/**",
    })
  } catch {
    return patterns
  }

  return patterns
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "110mb",
    },
  },
  images: {
    remotePatterns: supabaseStoragePatterns(),
  },
};

export default nextConfig;
