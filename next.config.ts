import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2gb" },
    proxyClientMaxBodySize: "2gb",
  },
  async headers() {
    return [
      {
        source: "/uploads/attachments/:path*",
        headers: [
          { key: "Accept-Ranges", value: "bytes" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "pimg.phinf.naver.net", pathname: "/**" },
      { protocol: "https", hostname: "k.kakaocdn.net", pathname: "/**" },
    ],
  },
};

export default nextConfig;
