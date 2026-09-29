import "server-only";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env";
import { hmacHex } from "@/lib/reveal/ids";

/**
 * Identificador do cliente para limites de abuso: HMAC do IP com uma chave derivada do segredo do servidor.
 * Na Vercel, x-forwarded-for é preenchido pela própria plataforma (o valor mandado pelo cliente é substituído).
 */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  const secret = serverEnv().supabase?.serviceRoleKey ?? "revelation-dev-only";
  return hmacHex(hmacHex(secret, "ip-hash-v1"), ip).slice(0, 32);
}
