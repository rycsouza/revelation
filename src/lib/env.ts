import "server-only";

/**
 * Variáveis de ambiente do servidor, validadas uma vez.
 * Nunca registre os valores: só os nomes das variáveis com problema.
 */
export interface ServerEnv {
  supabase: { url: string; serviceRoleKey: string } | null;
  cronSecret: string | null;
  problems: string[];
}

let cached: ServerEnv | null = null;

export function parseServerEnv(env: Record<string, string | undefined>, production: boolean): ServerEnv {
  const problems: string[] = [];
  const rawUrl = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const cron = env.CRON_SECRET?.trim();

  let url: string | null = null;
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
      if (parsed.pathname !== "/" || parsed.search) problems.push("SUPABASE_URL deve ser só o endereço base (sem /rest/v1).");
      else if (production && parsed.protocol !== "https:" && !local) problems.push("SUPABASE_URL precisa usar https.");
      else url = parsed.origin;
    } catch {
      problems.push("SUPABASE_URL não é uma URL válida.");
    }
  }
  if (key && key.length < 20) problems.push("SUPABASE_SERVICE_ROLE_KEY parece incompleta.");
  if (Boolean(rawUrl) !== Boolean(key)) problems.push("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY juntas.");

  let cronSecret: string | null = null;
  if (cron && cron.length >= 16) cronSecret = cron;
  else if (cron) problems.push("CRON_SECRET precisa ter pelo menos 16 caracteres.");
  else if (production && url) problems.push("CRON_SECRET ausente: a limpeza automática fica desligada.");

  const supabase = url && key && key.length >= 20 ? { url, serviceRoleKey: key } : null;
  return { supabase, cronSecret, problems };
}

export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env, process.env.NODE_ENV === "production");
  return cached;
}
