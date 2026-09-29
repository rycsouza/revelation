import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

let client: SupabaseClient | null | undefined;

/**
 * Cliente com a service role: só roda no servidor e ignora RLS.
 * Retorna null quando o Supabase não está configurado, e o app usa só as demos.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const { supabase } = serverEnv();
  client = supabase ? createClient(supabase.url, supabase.serviceRoleKey, { auth: { persistSession: false } }) : null;
  return client;
}
