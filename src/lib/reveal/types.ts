export const MECHANICS = ["scratch", "balloons", "giftbox", "countdown"] as const;
export type Mechanic = (typeof MECHANICS)[number];

export const THEMES = ["nuvem", "noite", "jardim"] as const;
export type ThemeId = (typeof THEMES)[number];

export type BabySex = "boy" | "girl";

/** Pessoa que recebe um link personalizado (`/r/<slug>?p=<guest.slug>`). */
export interface Guest {
  slug: string;
  /** Como a pessoa é chamada na abertura: "Vovó Maria". */
  name: string;
  /** O que a pessoa vai virar: "vovó", "titio", "dinda"... */
  becomes?: string;
}

/**
 * Tudo que pode ir para o navegador antes da revelação.
 * Nunca coloque aqui nada que entregue o sexo (inclusive o nome do bebê).
 */
export interface PublicReveal {
  slug: string;
  parents: string;
  mechanic: Mechanic;
  theme: ThemeId;
  message?: string;
  /** Até 3 fotos. Com mais de uma, a carta mostra um carrossel. */
  photoUrls: string[];
  musicUrl?: string;
  /** YYYY-MM-DD */
  dueDate?: string;
  guessEnabled: boolean;
  /** ISO. Só faz sentido na mecânica `countdown`: todo mundo revela no mesmo instante. */
  revealAt?: string;
}

/** Só sai do servidor pela rota `/api/r/[slug]/secret`, na hora da revelação. */
export interface RevealSecret {
  sex: BabySex;
  babyName?: string;
}

export interface WallMessage {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Score {
  boy: number;
  girl: number;
}

export interface GuessEntry {
  name?: string;
  guestSlug?: string;
  guess: BabySex;
  createdAt: string;
}

/** O que o painel do dono enxerga. */
export interface Dashboard {
  reveal: PublicReveal;
  secret: RevealSecret;
  guests: Guest[];
  guesses: GuessEntry[];
  messages: WallMessage[];
  /** As fotos com o caminho no Storage, para o formulário de edição saber o que manter. */
  photos: { path: string; url: string }[];
  expiresAt: string;
}

export const MECHANIC_INFO: Record<Mechanic, { label: string; emoji: string; description: string; demo: string }> = {
  scratch: {
    label: "Raspadinha",
    emoji: "🎟️",
    description: "A pessoa raspa a tela com o dedo até descobrir.",
    demo: "demo-raspadinha",
  },
  balloons: {
    label: "Estourar balões",
    emoji: "🎈",
    description: "Um toque em cada balão. O último solta a cor.",
    demo: "demo-baloes",
  },
  giftbox: {
    label: "Caixa de presente",
    emoji: "🎁",
    description: "Três toques no presente e a tampa voa.",
    demo: "demo-presente",
  },
  countdown: {
    label: "Contagem regressiva",
    emoji: "⏰",
    description: "Todo mundo descobre ao mesmo tempo, no horário marcado.",
    demo: "demo-ao-vivo",
  },
};

export const THEME_INFO: Record<ThemeId, { label: string; swatch: [string, string] }> = {
  nuvem: { label: "Nuvem", swatch: ["#fdf6ee", "#efe6ff"] },
  noite: { label: "Noite estrelada", swatch: ["#141233", "#2d1f52"] },
  jardim: { label: "Jardim", swatch: ["#f4f8ee", "#dfeedd"] },
};

export const SEX_INFO: Record<BabySex, { label: string; emoji: string; colors: string[] }> = {
  boy: { label: "É menino!", emoji: "💙", colors: ["#5aa9e6", "#9fd3ff", "#2f7fd1", "#ffffff"] },
  girl: { label: "É menina!", emoji: "💗", colors: ["#f28bb6", "#ffc2dc", "#e0598f", "#ffffff"] },
};

/** Sugestões para o campo "vai ser" do convidado. */
export const BECOMES_SUGGESTIONS = ["vovó", "vovô", "bisa", "titia", "titio", "dinda", "dindo", "prima", "primo"];
