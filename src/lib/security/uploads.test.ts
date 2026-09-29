import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { checkMusic, MAX_UPLOAD_BYTES, processPhoto, readUpload, UploadRejected } from "./uploads";

async function photoWithGps() {
  return sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#8a7f95" } })
    .withExif({ IFD0: { Make: "Celular da Ana" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "23/1 33/1 0/1" } })
    .jpeg()
    .toBuffer();
}

describe("processPhoto", () => {
  it("remove EXIF/GPS, reduz para 1600px e sempre devolve JPEG", async () => {
    const input = await photoWithGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const { data, file } = await processPhoto(new Uint8Array(input));
    const meta = await sharp(data).metadata();
    expect(file.mime).toBe("image/jpeg");
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
    expect(Math.max(meta.width!, meta.height!)).toBe(1600);
  });

  it("recusa arquivo disfarçado de foto", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(processPhoto(svg)).rejects.toBeInstanceOf(UploadRejected);
    // Cabeçalho de JPEG com lixo depois: a assinatura passa, mas o decodificador recusa.
    const fake = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new TextEncoder().encode("<?php system($_GET[1]); ?>")]);
    await expect(processPhoto(fake)).rejects.toBeInstanceOf(UploadRejected);
  });
});

describe("readUpload", () => {
  it("exige FormData com arquivo, não vazio e até 4 MB", async () => {
    await expect(readUpload({ file: "x" })).rejects.toBeInstanceOf(UploadRejected);
    const empty = new FormData();
    empty.append("file", new File([], "x.jpg"));
    await expect(readUpload(empty)).rejects.toBeInstanceOf(UploadRejected);
    const big = new FormData();
    big.append("file", new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "x.jpg"));
    await expect(readUpload(big)).rejects.toThrow("4 MB");
  });
});

describe("checkMusic", () => {
  it("usa o tipo detectado, não o informado", () => {
    expect(checkMusic(new Uint8Array([...new TextEncoder().encode("ID3"), ...Array(20).fill(0)])).mime).toBe("audio/mpeg");
    expect(() => checkMusic(new TextEncoder().encode("<html><script>alert(1)</script></html>"))).toThrow(UploadRejected);
  });
});
