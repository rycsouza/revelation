import { describe, expect, it } from "vitest";
import { getReveal, isLocked } from "./queries";
import type { RevealRecord } from "./store";

const record = (revealAt?: string, demo = false) =>
  ({
    id: "1",
    slug: "kxpnwhnjce",
    demo,
    reveal: { revealAt },
  }) as unknown as RevealRecord;

describe("trava da contagem ao vivo", () => {
  it("segura o segredo até o horário marcado", () => {
    const now = Date.now();
    expect(isLocked(record(new Date(now + 60_000).toISOString()), now)).toBe(true);
    expect(isLocked(record(new Date(now - 1).toISOString()), now)).toBe(false);
    expect(isLocked(record(undefined), now)).toBe(false);
  });

  it("slug fora do formato não chega ao banco", async () => {
    for (const slug of ["", "../x", "' or 1=1", "KXPNWHNJCE", "a".repeat(300)]) {
      expect(await getReveal(slug)).toBeNull();
    }
  });
});
