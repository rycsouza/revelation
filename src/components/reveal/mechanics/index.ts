import type { ComponentType } from "react";
import type { Mechanic } from "@/lib/reveal/types";
import { Balloons } from "./Balloons";
import { Countdown } from "./Countdown";
import { GiftBox } from "./GiftBox";
import { ScratchCard } from "./ScratchCard";
import type { MechanicProps } from "./types";

export const MECHANIC_COMPONENTS: Record<Mechanic, ComponentType<MechanicProps>> = {
  scratch: ScratchCard,
  balloons: Balloons,
  giftbox: GiftBox,
  countdown: Countdown,
};

/** A contagem sincronizada não pode buscar o segredo antes do horário (o servidor recusa). */
export function needsSecretUpfront(mechanic: Mechanic) {
  return mechanic !== "countdown";
}

export type { MechanicProps };
