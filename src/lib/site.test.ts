import { describe, expect, it } from "vitest";
import { absoluteUrl } from "./site";

describe("absoluteUrl", () => {
  it("acrescenta https quando falta o protocolo", () => {
    expect(absoluteUrl("revelation.rycsdev.com.br")).toBe("https://revelation.rycsdev.com.br");
  });

  it("mantém o protocolo e tira a barra final", () => {
    expect(absoluteUrl("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(absoluteUrl(" https://site.com.br// ")).toBe("https://site.com.br");
  });

  it("ignora vazio e inválido", () => {
    expect(absoluteUrl(undefined)).toBeUndefined();
    expect(absoluteUrl("   ")).toBeUndefined();
    expect(absoluteUrl("https://exa mple.com")).toBeUndefined();
  });
});
