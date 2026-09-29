/*
 * Conveniências guardadas só neste aparelho. localStorage pode falhar (aba anônima,
 * dados bloqueados), então tudo tem try/catch e um valor padrão.
 */

const DEVICE_KEY = "revelation:device";
export const MINE_KEY = "revelation:mine";

let memoryDeviceId: string | null = null;

/**
 * crypto.randomUUID só existe em HTTPS/localhost. No celular testando pelo IP da rede
 * (http://192.168...) ele não existe, então usamos getRandomValues, que funciona em qualquer lugar.
 */
export function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Identifica o aparelho para contar um palpite por pessoa e limitar recados. */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    memoryDeviceId ??= randomId();
    return memoryDeviceId;
  }
}

export interface MyReveal {
  slug: string;
  token: string;
  parents: string;
  createdAt: string;
}

export function listMyReveals(): MyReveal[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MINE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMyReveal(entry: MyReveal) {
  try {
    const list = listMyReveals();
    const existing = list.find((r) => r.slug === entry.slug);
    const next = existing
      ? list.map((r) => (r.slug === entry.slug ? { ...entry, createdAt: r.createdAt } : r))
      : [entry, ...list];
    localStorage.setItem(MINE_KEY, JSON.stringify(next));
  } catch {
    // Sem localStorage: o link de edição continua valendo, só não fica salvo aqui.
  }
}

export function forgetMyReveal(slug: string) {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(listMyReveals().filter((r) => r.slug !== slug)));
  } catch {}
}

export function editPath(slug: string, token: string) {
  return `/painel/${slug}#${token}`;
}
