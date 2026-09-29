import type { BabySex, Guest, PublicReveal, RevealSecret, Score, WallMessage } from "./types";

export interface RevealRecord {
  id: string;
  reveal: PublicReveal;
  guests: Guest[];
  secret: RevealSecret;
  demo?: boolean;
}

const guests: Guest[] = [
  { slug: "vovo", name: "Vovó Maria", becomes: "vovó" },
  { slug: "tio", name: "Tio João", becomes: "titio" },
  { slug: "dinda", name: "Carla", becomes: "dinda" },
];

const base = {
  parents: "Ana & Pedro",
  message: "Nossa família vai crescer, e a gente queria que você fosse um dos primeiros a saber.",
  dueDate: "2027-03-15",
  guessEnabled: true,
  photoUrls: ["/demo/ultrassom.svg", "/demo/sapatinhos.svg", "/demo/casal.svg"],
} satisfies Partial<PublicReveal>;

/** Próximo múltiplo de 2 minutos: dá para ver a contagem sincronizada sem esperar muito. */
function nextLiveSlot(now: number) {
  const slot = 2 * 60_000;
  return new Date(Math.ceil((now + 15_000) / slot) * slot).toISOString();
}

export function getDemoReveal(slug: string, now = Date.now()): RevealRecord | null {
  const common = { id: slug, demo: true, guests };
  switch (slug) {
    case "demo-raspadinha":
      return {
        ...common,
        reveal: { ...base, slug, mechanic: "scratch", theme: "nuvem" },
        secret: { sex: "girl", babyName: "Helena" },
      };
    case "demo-baloes":
      return {
        ...common,
        reveal: { ...base, slug, mechanic: "balloons", theme: "jardim" },
        secret: { sex: "boy", babyName: "Theo" },
      };
    case "demo-presente":
      return {
        ...common,
        reveal: { ...base, slug, mechanic: "giftbox", theme: "nuvem" },
        secret: { sex: "girl" },
      };
    case "demo-contagem":
      return {
        ...common,
        reveal: { ...base, slug, mechanic: "countdown", theme: "noite" },
        secret: { sex: "boy", babyName: "Miguel" },
      };
    case "demo-ao-vivo":
      return {
        ...common,
        reveal: { ...base, slug, mechanic: "countdown", theme: "noite", revealAt: nextLiveSlot(now) },
        secret: { sex: "girl", babyName: "Alice" },
      };
    default:
      return null;
  }
}

export function isDemoSlug(slug: string) {
  return slug.startsWith("demo-");
}

/* ---------- Palpites e mural das demos: em memória, somem quando o servidor reinicia ---------- */

const SEED_MESSAGES: Omit<WallMessage, "id" | "createdAt">[] = [
  { author: "Tia Rosa", body: "Que alegria!!! Já estou tricotando a mantinha 🧶" },
  { author: "Vovô Zé", body: "Melhor notícia do ano. Amo vocês!" },
];

const memory = new Map<string, { guesses: Map<string, BabySex>; messages: WallMessage[] }>();

function bucket(slug: string) {
  let entry = memory.get(slug);
  if (!entry) {
    const t = Date.now();
    entry = {
      guesses: new Map(),
      messages: SEED_MESSAGES.map((m, i) => ({ ...m, id: `seed-${i}`, createdAt: new Date(t - (i + 1) * 3_600_000).toISOString() })),
    };
    memory.set(slug, entry);
  }
  return entry;
}

// Palpites "da família" fictícia, para o placar não começar zerado.
const SEED_SCORE: Score = { boy: 6, girl: 4 };

export const demoMemory = {
  addGuess(slug: string, deviceId: string, guess: BabySex) {
    const { guesses } = bucket(slug);
    if (!guesses.has(deviceId)) guesses.set(deviceId, guess);
  },
  score(slug: string): Score {
    const score = { ...SEED_SCORE };
    for (const g of bucket(slug).guesses.values()) score[g]++;
    return score;
  },
  messages(slug: string) {
    return [...bucket(slug).messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  addMessage(slug: string, author: string, body: string) {
    const list = bucket(slug).messages;
    list.push({ id: crypto.randomUUID(), author, body, createdAt: new Date().toISOString() });
    if (list.length > 30) list.splice(SEED_MESSAGES.length, 1);
  },
};
