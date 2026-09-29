import { describe, expect, it } from "vitest";
import { guessInputSchema, messageInputSchema, ownerLinkSchema, revealInputSchema, type RevealInput } from "./schema";

const valid: RevealInput = {
  parents: "Ana & Pedro",
  message: "",
  dueDate: "",
  sex: "girl",
  babyName: " Helena ",
  mechanic: "scratch",
  theme: "nuvem",
  guessEnabled: true,
  revealAt: null,
  guests: [{ name: "Vovó Maria", becomes: "vovó" }],
};

describe("revealInputSchema", () => {
  it("aceita o mínimo e limpa campos vazios", () => {
    const data = revealInputSchema.parse(valid);
    expect(data.message).toBeUndefined();
    expect(data.dueDate).toBeUndefined();
    expect(data.babyName).toBe("Helena");
  });

  it("exige o sexo do bebê", () => {
    expect(revealInputSchema.safeParse({ ...valid, sex: undefined }).success).toBe(false);
  });

  it("só guarda horário marcado na contagem regressiva", () => {
    const revealAt = new Date(Date.now() + 86_400_000).toISOString();
    expect(revealInputSchema.parse({ ...valid, revealAt }).revealAt).toBeUndefined();
    expect(revealInputSchema.parse({ ...valid, mechanic: "countdown", revealAt }).revealAt).toBe(revealAt);
  });

  it("bloqueia mass assignment: campos a mais derrubam a validação", () => {
    for (const extra of [{ id: "x" }, { edit_token_hash: "x" }, { expires_at: "2099-01-01" }, { slug: "outraslug1" }]) {
      expect(revealInputSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
    }
    expect(revealInputSchema.safeParse({ ...valid, guests: [{ name: "X", reveal_id: "outra" }] }).success).toBe(false);
  });

  it("recusa slug de convidado com caracteres estranhos (filtro do banco usa a lista)", () => {
    for (const slug of ["../admin", "a,b", "a)or(1=1", "A"]) {
      expect(revealInputSchema.safeParse({ ...valid, guests: [{ name: "X", slug }] }).success).toBe(false);
    }
  });

  it("limita tamanho de listas e textos", () => {
    const guests = Array.from({ length: 81 }, (_, i) => ({ name: `Pessoa ${i}` }));
    expect(revealInputSchema.safeParse({ ...valid, guests }).success).toBe(false);
    expect(revealInputSchema.safeParse({ ...valid, parents: "a".repeat(61) }).success).toBe(false);
    expect(revealInputSchema.safeParse({ ...valid, message: "a".repeat(401) }).success).toBe(false);
  });

  it("recusa datas impossíveis e tira caracteres de controle", () => {
    expect(revealInputSchema.safeParse({ ...valid, dueDate: "2027-02-31" }).success).toBe(false);
    expect(revealInputSchema.safeParse({ ...valid, dueDate: "1900-01-01" }).success).toBe(false);
    expect(revealInputSchema.parse({ ...valid, parents: "Ana\u0000 &\u0007 Pedro" }).parents).toBe("Ana & Pedro");
  });
});

describe("entradas públicas", () => {
  it("palpite: formato de slug e aparelho, sem campos a mais", () => {
    const guess = { slug: "kxpnwhnjce", deviceId: "a".repeat(32), guess: "boy" };
    expect(guessInputSchema.safeParse(guess).success).toBe(true);
    expect(guessInputSchema.safeParse({ ...guess, guess: "admin" }).success).toBe(false);
    expect(guessInputSchema.safeParse({ ...guess, deviceId: "<script>" }).success).toBe(false);
    expect(guessInputSchema.safeParse({ ...guess, slug: "../x" }).success).toBe(false);
    expect(guessInputSchema.safeParse({ ...guess, reveal_id: "x" }).success).toBe(false);
  });

  it("recado: limites de tamanho", () => {
    const msg = { slug: "kxpnwhnjce", deviceId: "a".repeat(32), author: "Tia", body: "Oi" };
    expect(messageInputSchema.safeParse(msg).success).toBe(true);
    expect(messageInputSchema.safeParse({ ...msg, body: "a".repeat(501) }).success).toBe(false);
    expect(messageInputSchema.safeParse({ ...msg, body: "   " }).success).toBe(false);
  });

  it("link de edição: token no formato gerado pelo servidor", () => {
    expect(ownerLinkSchema.safeParse({ slug: "kxpnwhnjce", token: "a".repeat(32) }).success).toBe(true);
    expect(ownerLinkSchema.safeParse({ slug: "kxpnwhnjce", token: "a".repeat(31) }).success).toBe(false);
    expect(ownerLinkSchema.safeParse({ slug: "kxpnwhnjce", token: "' or 1=1 --aaaaaaaaaaaaaaaaaaa" }).success).toBe(false);
  });
});
