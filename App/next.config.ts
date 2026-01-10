import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["otplib", "qrcode"],
};

export default nextConfig;
