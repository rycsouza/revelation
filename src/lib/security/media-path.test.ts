import { describe, expect, it } from "vitest";
import { isRevealSlug, mediaUrl, parseMediaFile, storagePath } from "./media-path";

describe("caminhos de mídia", () => {
  it("aceita só slug e nome de arquivo gerados pelo servidor", () => {
    expect(isRevealSlug("kxpnwhnjce")).toBe(true);
    expect(parseMediaFile("photo-paxm44s7.jpg")).toEqual({ kind: "photo", ext: "jpg", mime: "image/jpeg" });
    expect(parseMediaFile("music-yzca8tk4.m4a")?.mime).toBe("audio/mp4");
  });

  it("bloqueia path traversal e nomes inventados", () => {
    for (const file of ["../secret.jpg", "photo-paxm44s7.jpg/../x", "photo-PAXM44S7.jpg", "photo-paxm44s7.svg", "photo-paxm44s7.html", "evil.jpg", "photo-paxm44s7.jpg%00.png"]) {
      expect(parseMediaFile(file)).toBeNull();
    }
    expect(storagePath("../etc", "photo-paxm44s7.jpg")).toBeNull();
    expect(storagePath("kxpnwhnjce", "../../photo-paxm44s7.jpg")).toBeNull();
    expect(isRevealSlug("demo-raspadinha")).toBe(false);
    expect(isRevealSlug("KXPNWHNJCE")).toBe(false);
  });

  it("gera URL do próprio site, nunca do Supabase", () => {
    expect(mediaUrl("kxpnwhnjce/photo-paxm44s7.jpg")).toBe("/m/kxpnwhnjce/photo-paxm44s7.jpg");
    expect(mediaUrl("outro/../../x")).toBeNull();
  });
});
