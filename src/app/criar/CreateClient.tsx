"use client";

import { useRouter } from "next/navigation";
import { createRevealAction } from "@/app/actions/owner";
import { EMPTY_FORM, RevealForm, type MediaChanges } from "@/components/creator/RevealForm";
import { saveMusic, syncPhotos } from "@/lib/client/upload";
import type { RevealInput } from "@/lib/reveal/schema";

export function CreateClient() {
  const router = useRouter();

  async function create(input: RevealInput, media: MediaChanges) {
    // O servidor cria e já deixa este navegador como dono (cookie HttpOnly). O token não passa pelo JavaScript.
    const res = await createRevealAction(input);
    if (!res.ok) return res.error;

    // A revelação já existe: se um arquivo falhar, o painel avisa e deixa tentar de novo.
    let uploadFailed = false;
    try {
      if (media.photos?.length) await syncPhotos(res.slug, [], media.photos);
    } catch {
      uploadFailed = true;
    }
    try {
      if (media.music) await saveMusic(res.slug, media.music);
    } catch {
      uploadFailed = true;
    }

    router.push(`/painel/${res.slug}?novo=1${uploadFailed ? "&aviso=upload" : ""}`);
    return null;
  }

  return <RevealForm mode="create" initial={EMPTY_FORM} onSubmit={create} />;
}
