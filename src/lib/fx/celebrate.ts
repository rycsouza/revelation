import confetti from "canvas-confetti";
import { SEX_INFO, type BabySex } from "@/lib/reveal/types";
import { sfx, vibrate } from "./sound";

export const NEUTRAL_COLORS = ["#f2c14e", "#fdfcf7", "#c8b6ff", "#b8e0d2", "#ffc8a2"];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Confete pequeno num ponto da tela (coordenadas em pixels do viewport). */
export function sparkle(x: number, y: number, colors = NEUTRAL_COLORS, particleCount = 24) {
  if (prefersReducedMotion()) return;
  void confetti({
    particleCount,
    spread: 70,
    startVelocity: 22,
    ticks: 90,
    scalar: 0.8,
    colors,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    disableForReducedMotion: true,
  });
}

/** O grande momento: chuva de confete na cor do bebê, fanfarra e vibração. */
export function celebrate(sex: BabySex) {
  const colors = SEX_INFO[sex].colors;
  sfx.fanfare();
  vibrate([90, 50, 90, 50, 400]);

  if (prefersReducedMotion()) {
    void confetti({ particleCount: 60, spread: 90, colors, origin: { y: 0.6 }, disableForReducedMotion: false, ticks: 60 });
    return;
  }

  void confetti({ particleCount: 180, spread: 110, startVelocity: 55, colors, origin: { y: 0.65 } });

  const end = Date.now() + 2800;
  const frame = () => {
    void confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
    void confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
