import "server-only";
import sharp from "sharp";
import { detectAudio, detectImage, type DetectedFile } from "./file-signature";

/** Limite de cada arquivo. Cabe no corpo máximo de requisição da Vercel (4,5 MB) com folga para o multipart. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Fotos gigantes (ex.: 10000×10000) consomem memória demais para decodificar. */
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_PHOTO_SIDE = 1600;

export class UploadRejected extends Error {}

/** Lê o File do FormData com todas as checagens que não dependem do conteúdo. */
export async function readUpload(form: unknown): Promise<Uint8Array> {
  if (!(form instanceof FormData)) throw new UploadRejected("Envio inválido.");
  const file = form.get("file");
  if (!(file instanceof File)) throw new UploadRejected("Nenhum arquivo enviado.");
  if (file.size <= 0) throw new UploadRejected("O arquivo está vazio.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadRejected("O arquivo pode ter no máximo 4 MB.");
  return new Uint8Array(await file.arrayBuffer());
}

/**
 * Foto: confere a assinatura real e REPROCESSA a imagem.
 * Reprocessar remove EXIF/GPS (a localização da casa pode estar na foto do celular),
 * corrige a rotação e descarta qualquer coisa escondida no arquivo original (polyglots).
 */
export async function processPhoto(bytes: Uint8Array): Promise<{ data: Buffer; file: DetectedFile }> {
  if (!detectImage(bytes)) throw new UploadRejected("Use uma foto JPG, PNG ou WebP.");
  try {
    const data = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize(MAX_PHOTO_SIDE, MAX_PHOTO_SIDE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { data, file: { mime: "image/jpeg", ext: "jpg" } };
  } catch {
    throw new UploadRejected("Não conseguimos abrir essa foto. Tente outra.");
  }
}

/** Música: só formatos de áudio conhecidos, pela assinatura. O tipo servido depois vem daqui, não do navegador. */
export function checkMusic(bytes: Uint8Array): DetectedFile {
  const file = detectAudio(bytes);
  if (!file) throw new UploadRejected("Use uma música MP3, M4A, AAC, OGG ou WAV.");
  return file;
}
