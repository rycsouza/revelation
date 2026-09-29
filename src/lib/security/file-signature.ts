/*
 * Detecta o tipo REAL do arquivo pelos primeiros bytes (assinatura / "magic number").
 * O tipo informado pelo navegador (file.type) é controlado pelo cliente e não vale nada sozinho.
 */

export interface DetectedFile {
  mime: string;
  ext: string;
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

export function detectImage(bytes: Uint8Array): DetectedFile | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return { mime: "image/png", ext: "png" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

// Marcas de container MP4 que são áudio (ou genéricas o bastante para o player de áudio).
const MP4_AUDIO_BRANDS = new Set(["M4A ", "M4B ", "mp41", "mp42", "isom", "iso2", "dash"]);

export function detectAudio(bytes: Uint8Array): DetectedFile | null {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 3) === "ID3") return { mime: "audio/mpeg", ext: "mp3" };
  if (ascii(bytes, 0, 4) === "OggS") return { mime: "audio/ogg", ext: "ogg" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") return { mime: "audio/wav", ext: "wav" };
  if (ascii(bytes, 4, 4) === "ftyp" && MP4_AUDIO_BRANDS.has(ascii(bytes, 8, 4))) return { mime: "audio/mp4", ext: "m4a" };
  // AAC cru (ADTS) antes do MP3: os dois começam com 0xFFF, o ADTS tem layer = 00.
  if (bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return { mime: "audio/aac", ext: "aac" };
  // MP3 sem tag ID3: frame sync de 11 bits, versão/layer válidos.
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0) return { mime: "audio/mpeg", ext: "mp3" };
  return null;
}
