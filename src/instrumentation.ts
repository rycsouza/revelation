/** Roda uma vez quando o servidor sobe: avisa nos logs se a configuração estiver errada. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { serverEnv } = await import("@/lib/env");
  const { problems, supabase } = serverEnv();
  for (const problem of problems) console.error(JSON.stringify({ type: "config", level: "error", problem }));
  if (!supabase) console.warn(JSON.stringify({ type: "config", level: "warn", problem: "Supabase desligado: só as demos funcionam." }));
}
