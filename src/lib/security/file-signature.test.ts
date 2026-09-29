import { describe, expect, it } from "vitest";
import { detectAudio, detectImage } from "./file-signature";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)).concat(Array(16).fill(0)));

describe("detectImage", () => {
  it("reconhece JPEG, PNG e WebP pela assinatura", () => {
    expect(detectImage(bytes([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(detectImage(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe("image/png");
    expect(detectImage(bytes("RIFF", [0, 0, 0, 0], "WEBP"))?.mime).toBe("image/webp");
  });

  it("recusa SVG, HTML, GIF e executável, mesmo que o navegador diga que é imagem", () => {
    expect(detectImage(bytes('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">'))).toBeNull();
    expect(detectImage(bytes("<!doctype html><script>alert(1)</script>"))).toBeNull();
    expect(detectImage(bytes("GIF89a"))).toBeNull();
    expect(detectImage(bytes("MZ", [0x90, 0x00]))).toBeNull();
    expect(detectImage(new Uint8Array([0xff, 0xd8]))).toBeNull(); // curto demais
  });
});

describe("detectAudio", () => {
  it("reconhece MP3, M4A, OGG, WAV e AAC", () => {
    expect(detectAudio(bytes("ID3", [4, 0, 0]))?.ext).toBe("mp3");
    expect(detectAudio(bytes([0xff, 0xfb, 0x90, 0x64]))?.ext).toBe("mp3");
    expect(detectAudio(bytes([0, 0, 0, 0x20], "ftyp", "M4A "))?.ext).toBe("m4a");
    expect(detectAudio(bytes("OggS"))?.ext).toBe("ogg");
    expect(detectAudio(bytes("RIFF", [0, 0, 0, 0], "WAVE"))?.ext).toBe("wav");
    expect(detectAudio(bytes([0xff, 0xf1, 0x50, 0x80]))?.ext).toBe("aac");
  });

  it("recusa o que não é áudio", () => {
    expect(detectAudio(bytes("<html>"))).toBeNull();
    expect(detectAudio(bytes([0, 0, 0, 0x20], "ftyp", "qt  "))).toBeNull(); // vídeo QuickTime
    expect(detectAudio(bytes("RIFF", [0, 0, 0, 0], "AVI "))).toBeNull();
    expect(detectAudio(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBeNull(); // JPEG
  });
});
