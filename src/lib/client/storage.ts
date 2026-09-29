/*
 * Conveniências guardadas só neste aparelho. localStorage pode falhar (aba anônima,
 * dados bloqueados), então tudo tem try/catch e um valor padrão.
 * Nada de segredo aqui: o acesso do dono fica num cookie HttpOnly, que o JavaScript não lê.
 */

const DEVICE_KEY = "revelation:device";
/** Chave antiga, de quando o token de edição ficava no navegador. Apagada na primeira visita. */
const LEGACY_MINE_KEY = "revelation:mine";

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
    if (!id || !/^[a-f0-9-]{16,64}$/.test(id)) {
      id = randomId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    memoryDeviceId ??= randomId();
    return memoryDeviceId;
  }
}

export function removeLegacyTokens() {
  try {
    localStorage.removeItem(LEGACY_MINE_KEY);
  } catch {}
}

export function editUrl(origin: string, slug: string, token: string) {
  return `${origin}/painel/${slug}#${token}`;
}
