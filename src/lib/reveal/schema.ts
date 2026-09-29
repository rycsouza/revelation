import { z } from "zod";
import { MECHANICS, THEMES } from "./types";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const guestInputSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional(),
  name: z.string().trim().min(1, "Coloque o nome").max(40),
  becomes: optionalText(30),
});

/** O que o formulário de criação/edição envia. Validado igual no cliente e no servidor. */
export const revealInputSchema = z
  .object({
    parents: z.string().trim().min(2, "Coloque o nome de vocês").max(60),
    message: optionalText(400),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    sex: z.enum(["boy", "girl"], { error: "Escolha menino ou menina" }),
    babyName: optionalText(40),
    mechanic: z.enum(MECHANICS),
    theme: z.enum(THEMES),
    guessEnabled: z.boolean(),
    revealAt: z.iso.datetime({ offset: true }).optional().nullable(),
    guests: z.array(guestInputSchema).max(80, "No máximo 80 convidados"),
  })
  .transform((v) => ({
    ...v,
    // Horário marcado só existe na contagem.
    revealAt: v.mechanic === "countdown" ? (v.revealAt ?? undefined) : undefined,
  }));

export type RevealInput = z.input<typeof revealInputSchema>;
export type RevealData = z.output<typeof revealInputSchema>;

export const guessInputSchema = z.object({
  slug: z.string().min(1).max(64),
  deviceId: z.string().min(8).max(64),
  guestSlug: z.string().max(40).optional(),
  name: optionalText(40),
  guess: z.enum(["boy", "girl"]),
});

export const messageInputSchema = z.object({
  slug: z.string().min(1).max(64),
  deviceId: z.string().min(8).max(64),
  author: z.string().trim().min(1, "Coloque seu nome").max(60),
  body: z.string().trim().min(1, "Escreva um recado").max(500),
});

export const MEDIA_RULES = {
  photo: { maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  music: {
    maxBytes: 8 * 1024 * 1024,
    types: ["audio/mpeg", "audio/mp4", "audio/aac", "audio/x-m4a", "audio/ogg", "audio/wav"],
  },
} as const;

export type MediaKind = keyof typeof MEDIA_RULES;

export const MAX_PHOTOS = 3;
