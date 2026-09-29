import { attachMusic, requestUpload, setPhotosAction } from "@/app/actions/owner";
import type { MediaKind } from "@/lib/reveal/schema";

/** Reduz a foto para no máximo 1600px e JPEG: ultrassom de celular chega fácil a 5 MB. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // Formato que o navegador não abre (ex.: HEIC no Chrome): manda o original e o servidor decide.
    return file;
  }
}

/** Sobe o arquivo direto para o Storage com uma URL assinada. Retorna o caminho, ainda sem ligar na revelação. */
export async function uploadFile(slug: string, token: string, kind: MediaKind, file: File) {
  const body = kind === "photo" ? await compressImage(file) : file;
  const type = body.type || file.type;

  const ticket = await requestUpload(slug, token, kind, type, body.size);
  if (!ticket.ok) throw new Error(ticket.error);

  const form = new FormData();
  form.append("cacheControl", "31536000");
  form.append("", body, file.name);
  const res = await fetch(ticket.uploadUrl, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
  if (!res.ok) throw new Error("Não foi possível enviar o arquivo. Tente de novo.");
  return ticket.path;
}

/** Uma foto já salva (mantém o caminho) ou uma nova (sobe o arquivo). */
export type PhotoItem = { key: string; path: string; url: string } | { key: string; file: File };

/** Sobe as fotos novas e grava a lista final, na ordem. As que saíram são apagadas pelo servidor. */
export async function savePhotos(slug: string, token: string, items: PhotoItem[]) {
  const paths: string[] = [];
  for (const item of items) paths.push("file" in item ? await uploadFile(slug, token, "photo", item.file) : item.path);
  const res = await setPhotosAction(slug, token, paths);
  if (!res.ok) throw new Error(res.error);
}

/** Troca a música (File) ou remove (null). */
export async function saveMusic(slug: string, token: string, file: File | null) {
  const path = file ? await uploadFile(slug, token, "music", file) : null;
  const res = await attachMusic(slug, token, path);
  if (!res.ok) throw new Error(res.error);
}
