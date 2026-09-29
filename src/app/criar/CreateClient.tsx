"use client";

import { useRouter } from "next/navigation";
import { createRevealAction } from "@/app/actions/owner";
import { EMPTY_FORM, RevealForm, type MediaChanges } from "@/components/creator/RevealForm";
import { editPath, saveMyReveal } from "@/lib/client/storage";
import { saveMusic, savePhotos } from "@/lib/client/upload";
import type { RevealInput } from "@/lib/reveal/schema";

export function CreateClient() {
  const router = useRouter();

  async function create(input: RevealInput, media: MediaChanges) {
    const res = await createRevealAction(input);
    if (!res.ok) return res.error;

    saveMyReveal({ slug: res.slug, token: res.token, parents: input.parents, createdAt: new Date().toISOString() });

    // A revelação já existe: se um arquivo falhar, o painel avisa e deixa tentar de novo.
    let uploadFailed = false;
    try {
      if (media.photos?.length) await savePhotos(res.slug, res.token, media.photos);
    } catch {
      uploadFailed = true;
    }
    try {
      if (media.music) await saveMusic(res.slug, res.token, media.music);
    } catch {
      uploadFailed = true;
    }

    const query = uploadFailed ? "?aviso=upload&novo=1" : "?novo=1";
    router.push(`${editPath(res.slug, res.token).replace("#", `${query}#`)}`);
    return null;
  }

  return <RevealForm mode="create" initial={EMPTY_FORM} onSubmit={create} />;
}
