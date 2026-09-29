import { describe, expect, it } from "vitest";
import { revealInputSchema, type RevealInput } from "./schema";

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
    const result = revealInputSchema.safeParse({ ...valid, sex: undefined });
    expect(result.success).toBe(false);
  });

  it("só guarda horário marcado na contagem regressiva", () => {
    const revealAt = "2027-01-01T20:00:00.000Z";
    expect(revealInputSchema.parse({ ...valid, revealAt }).revealAt).toBeUndefined();
    expect(revealInputSchema.parse({ ...valid, mechanic: "countdown", revealAt }).revealAt).toBe(revealAt);
  });

  it("recusa slug de convidado com caracteres estranhos", () => {
    const result = revealInputSchema.safeParse({ ...valid, guests: [{ name: "X", slug: "../admin" }] });
    expect(result.success).toBe(false);
  });

  it("limita a quantidade de convidados", () => {
    const guests = Array.from({ length: 81 }, (_, i) => ({ name: `Pessoa ${i}` }));
    expect(revealInputSchema.safeParse({ ...valid, guests }).success).toBe(false);
  });
});
