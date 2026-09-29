import { z } from "zod";
import { MECHANICS, THEMES } from "./types";

/*
 * Schemas de TUDO que chega do cliente. Objetos estritos: campo a mais (id, edit_token_hash, expires_at…)
 * faz a validação falhar, então não existe mass assignment.
 */

/** Tira caracteres de controle invisíveis (mantém quebra de linha só onde pedido). */
function clean(value: string, keepNewlines = false) {
  const control = keepNewlines ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.replace(control, "").trim();
}

const text = (min: number, max: number, message?: string, keepNewlines = false) =>
  z
    .string()
    .max(max * 2)
    .transform((v) => clean(v, keepNewlines))
    .pipe(z.string().min(min, message).max(max));

const optionalText = (max: number, keepNewlines = false) =>
  z
    .string()
    .max(max * 2)
    .optional()
    .transform((v) => (v === undefined ? undefined : clean(v, keepNewlines) || undefined))
    .pipe(z.string().max(max).optional());

/** Data real (não aceita 2027-02-31) e num intervalo que faz sentido para uma gravidez. */
const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    const year = Number(v.slice(0, 4));
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && year >= 2020 && year <= 2100;
  }, "Data inválida");

export const guestInputSchema = z.strictObject({
  slug: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional(),
  name: text(1, 40, "Coloque o nome"),
  becomes: optionalText(30),
});

/** O que o formulário de criação/edição envia. Validado igual no cliente e no servidor. */
export const revealInputSchema = z
  .strictObject({
    parents: text(2, 60, "Coloque o nome de vocês"),
    message: optionalText(400, true),
    dueDate: dueDate.optional().or(z.literal("").transform(() => undefined)),
    sex: z.enum(["boy", "girl"], { error: "Escolha menino ou menina" }),
    babyName: optionalText(40),
    mechanic: z.enum(MECHANICS),
    theme: z.enum(THEMES),
    guessEnabled: z.boolean(),
    revealAt: z.iso
      .datetime({ offset: true })
      .refine((v) => Math.abs(Date.parse(v) - Date.now()) < 3 * 365 * 86_400_000, "Horário inválido")
      .optional()
      .nullable(),
    guests: z.array(guestInputSchema).max(80, "No máximo 80 convidados"),
  })
  .transform((v) => ({
    ...v,
    // Horário marcado só existe na contagem.
    revealAt: v.mechanic === "countdown" ? (v.revealAt ?? undefined) : undefined,
  }));

export type RevealInput = z.input<typeof revealInputSchema>;
export type RevealData = z.output<typeof revealInputSchema>;

/** Mesmo alfabeto de randomSlug; demos também são aceitas onde fizer sentido. */
export const slugSchema = z.string().regex(/^([2-9a-hjkmnp-z]{10}|demo-[a-z-]{1,20})$/);
/** Gerado por randomId() no navegador: 32 caracteres hexadecimais. */
const deviceId = z.string().regex(/^[a-f0-9-]{16,64}$/);

export const guessInputSchema = z.strictObject({
  slug: slugSchema,
  deviceId,
  guestSlug: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional(),
  name: optionalText(40),
  guess: z.enum(["boy", "girl"]),
});

export const messageInputSchema = z.strictObject({
  slug: slugSchema,
  deviceId,
  author: text(1, 60, "Coloque seu nome"),
  body: text(1, 500, "Escreva um recado", true),
});

/** Link de edição: slug + token (base64url de 24 bytes = 32 caracteres). */
export const ownerLinkSchema = z.strictObject({
  slug: z.string().regex(/^[2-9a-hjkmnp-z]{10}$/),
  token: z.string().regex(/^[A-Za-z0-9_-]{32}$/),
});

export const photoPathSchema = z.string().regex(/^[2-9a-hjkmnp-z]{10}\/photo-[2-9a-hjkmnp-z]{8}\.(jpg|png|webp)$/);

export const MAX_PHOTOS = 3;

/** Só para a interface: o servidor confere a assinatura real do arquivo, não o tipo informado. */
export const MEDIA_ACCEPT = {
  photo: "image/jpeg,image/png,image/webp",
  music: "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,.mp3,.m4a,.aac,.ogg,.wav",
} as const;
