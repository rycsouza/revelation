/*
 * Cache no navegador, no estilo stale-while-revalidate:
 * - dentro de `freshMs`, usa o valor guardado sem perguntar ao servidor;
 * - até `maxAgeMs`, mostra o valor guardado na hora e atualiza em segundo plano;
 * - depois disso, descarta.
 * Fica em memória e em sessionStorage (some ao fechar a aba). Nunca guarde token ou segredo de outra pessoa aqui.
 */

interface Entry<T> {
  at: number;
  value: T;
}

const PREFIX = "revelation:cache:";
const memory = new Map<string, Entry<unknown>>();

function readStored<T>(key: string): Entry<T> | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Entry<T>) : null;
  } catch {
    return null;
  }
}

export function readCache<T>(key: string, { freshMs, maxAgeMs }: { freshMs: number; maxAgeMs: number }, now = Date.now()) {
  const entry = (memory.get(key) as Entry<T> | undefined) ?? readStored<T>(key);
  if (!entry || typeof entry.at !== "number") return null;
  const age = now - entry.at;
  if (age < 0 || age > maxAgeMs) {
    memory.delete(key);
    return null;
  }
  return { value: entry.value, fresh: age <= freshMs };
}

export function writeCache<T>(key: string, value: T, now = Date.now()) {
  const entry: Entry<T> = { at: now, value };
  memory.set(key, entry);
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Aba anônima ou armazenamento cheio: fica só em memória.
  }
}

export function clearCache(key: string) {
  memory.delete(key);
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {}
}

/** Tempos usados no app. */
export const CACHE_TIMES = {
  /** Resultado da revelação (sexo + mural): não muda depois de revelado. */
  reveal: { freshMs: 10 * 60_000, maxAgeMs: 30 * 60_000 },
  /** Mural e placar: mudam quando a família participa. */
  wall: { freshMs: 30_000, maxAgeMs: 10 * 60_000 },
};
