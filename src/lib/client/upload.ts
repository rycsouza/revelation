import {
  removeMusicAction,
  removePhotoAction,
  reorderPhotosAction,
  setMusicAction,
  uploadPhotoAction,
} from "@/app/actions/owner";

/**
 * Reduz a foto para no máximo 1600px e JPEG antes de enviar: sobe mais rápido pelo celular
 * e cabe no limite de 4 MB. (O servidor reprocessa de qualquer jeito, e é lá que o GPS sai.)
 */
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

const MAX_BYTES = 4 * 1024 * 1024;

function asForm(blob: Blob, name: string) {
  if (blob.size > MAX_BYTES) throw new Error("O arquivo pode ter no máximo 4 MB.");
  const form = new FormData();
  form.append("file", blob, name);
  return form;
}

/** Uma foto já salva (mantém o caminho) ou uma nova (ainda vai subir). */
export type PhotoItem = { key: string; path: string; url: string } | { key: string; file: File };

/**
 * Leva as fotos salvas até a lista final: remove as que saíram, sobe as novas pelo servidor e grava a ordem.
 * `saved` é a lista que está no servidor agora.
 */
export async function syncPhotos(slug: string, saved: string[], items: PhotoItem[]) {
  const keep = new Set(items.flatMap((i) => ("path" in i ? [i.path] : [])));
  for (const path of saved) {
    if (keep.has(path)) continue;
    const res = await removePhotoAction(slug, path);
    if (!res.ok) throw new Error(res.error);
  }

  const finalPaths: string[] = [];
  for (const item of items) {
    if ("path" in item) {
      finalPaths.push(item.path);
      continue;
    }
    const res = await uploadPhotoAction(slug, asForm(await compressImage(item.file), "foto.jpg"));
    if (!res.ok) throw new Error(res.error);
    finalPaths.push(res.path);
  }

  const current = [...saved.filter((p) => keep.has(p)), ...finalPaths.filter((p) => !saved.includes(p))];
  if (finalPaths.join() !== current.join()) {
    const res = await reorderPhotosAction(slug, finalPaths);
    if (!res.ok) throw new Error(res.error);
  }
}

/** Troca a música (File) ou remove (null). */
export async function saveMusic(slug: string, file: File | null) {
  const res = file ? await setMusicAction(slug, asForm(file, "musica")) : await removeMusicAction(slug);
  if (!res.ok) throw new Error(res.error);
}
