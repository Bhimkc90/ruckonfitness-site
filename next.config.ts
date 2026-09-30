import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard is the app's home. Temporary (307) so "/" can become a public landing page later.
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
