import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir o servidor de desenvolvimento pelo celular na mesma rede Wi-Fi (http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],

  // Só em desenvolvimento: repassa o Storage do Supabase local pelo próprio Next (ver browserUrl em store.ts).
  async rewrites() {
    const supabase = process.env.SUPABASE_URL?.replace(/\/$/, "");
    if (process.env.NODE_ENV !== "development" || !supabase) return [];
    return [{ source: "/supabase-storage/:path*", destination: `${supabase}/storage/v1/:path*` }];
  },
};

export default nextConfig;
