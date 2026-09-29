/**
 * Logs estruturados (JSON) para eventos de segurança e erros.
 * Regra: só identificadores públicos (slug), hash de IP e motivos. Nunca token, cookie, conteúdo de arquivo ou texto de recado.
 */
type Fields = Record<string, string | number | boolean | null | undefined>;

export function logSecurity(action: string, fields: Fields = {}) {
  console.warn(JSON.stringify({ type: "security", action, at: new Date().toISOString(), ...fields }));
}

export function logError(context: string, err: unknown, fields: Fields = {}) {
  const e = err as { message?: unknown; code?: unknown } | null;
  console.error(
    JSON.stringify({
      type: "error",
      context,
      at: new Date().toISOString(),
      message: typeof e?.message === "string" ? e.message.slice(0, 300) : "unknown",
      code: typeof e?.code === "string" ? e.code : undefined,
      ...fields,
    }),
  );
}
