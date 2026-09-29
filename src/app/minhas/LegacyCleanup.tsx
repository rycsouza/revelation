"use client";

import { useEffect } from "react";
import { removeLegacyTokens } from "@/lib/client/storage";

/** Versões antigas guardavam o token de edição no localStorage. Apaga na primeira visita. */
export function LegacyCleanup() {
  useEffect(() => removeLegacyTokens(), []);
  return null;
}
