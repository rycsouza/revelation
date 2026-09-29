import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logError, logSecurity } from "./log";

/** Limites por janela fixa. Pensados para uma família no mesmo Wi-Fi (mesmo IP) não esbarrar neles. */
export const RATE_LIMITS = {
  /** Criar revelação, por IP. */
  create: { limit: 10, windowSeconds: 3600 },
  /** Palpites numa revelação, por IP. */
  guess: { limit: 40, windowSeconds: 3600 },
  /** Recados numa revelação, por IP. */
  message: { limit: 15, windowSeconds: 3600 },
  /** Uploads numa revelação (dono). */
  upload: { limit: 30, windowSeconds: 3600 },
  /** Tentativas de abrir o painel com um link de edição, por IP. */
  panel: { limit: 20, windowSeconds: 600 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export function rateLimitKey(bucket: RateLimitBucket, ...parts: string[]) {
  return [bucket, ...parts].join(":").slice(0, 200);
}

/**
 * Conta uma tentativa e diz se ainda está dentro do limite.
 * Se o banco não responder (ex.: migration ainda não aplicada), deixa passar e registra o erro:
 * é um site pessoal, e travar tudo por causa do contador seria pior que o abuso que ele evita.
 */
export async function hitRateLimit(bucket: RateLimitBucket, ...parts: string[]): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return true;
  const { limit, windowSeconds } = RATE_LIMITS[bucket];
  const { data, error } = await supabase.rpc("hit_rate_limit", {
    p_key: rateLimitKey(bucket, ...parts),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    logError("rate_limit_unavailable", error, { bucket });
    return true;
  }
  if (data !== true) logSecurity("rate_limited", { bucket });
  return data === true;
}
