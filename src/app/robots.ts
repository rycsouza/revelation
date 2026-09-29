import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Revelações e painéis são privados: só quem tem o link acessa.
    rules: { userAgent: "*", allow: "/", disallow: ["/r/", "/painel/", "/minhas", "/api/"] },
    host: site.url,
  };
}
