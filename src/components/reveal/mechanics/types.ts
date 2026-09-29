import type { PublicReveal, RevealSecret } from "@/lib/reveal/types";

/**
 * Contrato de toda mecânica de revelação. Para criar uma nova:
 * 1. crie o componente aqui na pasta recebendo estas props;
 * 2. chame `onReveal()` uma única vez, no instante da revelação;
 * 3. registre em `./index.ts` e em `MECHANICS` (lib/reveal/types.ts).
 *
 * A comemoração (confete, som, vibração) e a tela de resultado ficam por conta do RevealExperience.
 */
export interface MechanicProps {
  reveal: PublicReveal;
  /** Chega antes da interação nas mecânicas que precisam da cor para desenhar. Pode ser null enquanto carrega. */
  secret: RevealSecret | null;
  onReveal: () => void;
  /** Relógio corrigido pelo horário do servidor (importa para a contagem sincronizada). */
  now: () => number;
}
