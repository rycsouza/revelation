import { describe, expect, it } from "vitest";
import { assignGuestSlugs, hashSecret, randomSlug, randomToken, slugify, tokenMatches } from "./ids";

describe("slugify", () => {
  it("remove acentos e espaços", () => {
    expect(slugify("Vovó Maria")).toBe("vovo-maria");
    expect(slugify("  Tia Conceição & João ")).toBe("tia-conceicao-joao");
  });

  it("nunca devolve vazio", () => {
    expect(slugify("💖")).toBe("convidado");
  });
});

describe("assignGuestSlugs", () => {
  it("mantém slugs existentes e desempata nomes repetidos", () => {
    const result = assignGuestSlugs([
      { name: "Vovó Cida", slug: "vovo-cida" },
      { name: "Vovó Cida" },
      { name: "Vovó Cida" },
      { name: "Tio Beto" },
    ]);
    expect(result.map((g) => g.slug)).toEqual(["vovo-cida", "vovo-cida-2", "vovo-cida-3", "tio-beto"]);
  });

  it("não reaproveita um slug que outro convidado já tem, mesmo trocando o nome", () => {
    const result = assignGuestSlugs([{ name: "Ana" }, { name: "Qualquer", slug: "ana" }]);
    expect(result.map((g) => g.slug)).toEqual(["ana-2", "ana"]);
  });
});

describe("tokens", () => {
  it("confere o token pelo hash", () => {
    const token = randomToken();
    const hash = hashSecret(token);
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches(`${token}x`, hash)).toBe(false);
    expect(tokenMatches(token, "abc")).toBe(false);
  });

  it("gera slugs sem caracteres ambíguos", () => {
    for (let i = 0; i < 200; i++) expect(randomSlug()).toMatch(/^[2-9a-hjkmnp-z]{10}$/);
  });
});
