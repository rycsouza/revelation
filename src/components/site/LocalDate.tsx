"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Data no fuso de quem está vendo. No servidor (SSR) sai só o ISO num <time>,
 * e o navegador troca pelo texto formatado sem divergir na hidratação.
 */
export function LocalDate({ iso, options }: { iso: string; options: Intl.DateTimeFormatOptions }) {
  const onClient = useSyncExternalStore(noop, () => true, () => false);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {onClient ? new Date(iso).toLocaleString("pt-BR", options) : ""}
    </time>
  );
}
