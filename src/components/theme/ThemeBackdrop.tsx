import type { CSSProperties } from "react";
import type { ThemeId } from "@/lib/reveal/types";

/*
 * Decoração de fundo de cada tema. Só CSS e SVG, sem estado: funciona em Server e Client Components.
 * Cores neutras de propósito (nada de azul ou rosa), para o fundo não dar pista do sexo.
 * Posições fixas (sem Math.random) para o HTML do servidor e do navegador baterem.
 */

type Item = { l: number; t: number; w: number; o?: number; d: number; delay?: number; c?: string; r?: number };

const vars = (v: Record<string, string | number>) => v as CSSProperties;

/* ---------- Nuvem ---------- */

function Cloud({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 120 60" className={className} style={style} aria-hidden>
      <g fill="#fff">
        <circle cx="34" cy="38" r="20" />
        <circle cx="60" cy="26" r="25" />
        <circle cx="87" cy="36" r="19" />
        <rect x="30" y="34" width="62" height="24" rx="12" />
      </g>
    </svg>
  );
}

function Sparkle({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path d="M12 0 14.2 9.8 24 12 14.2 14.2 12 24 9.8 14.2 0 12 9.8 9.8Z" fill={color} />
    </svg>
  );
}

const CLOUDS: Item[] = [
  { l: -6, t: 7, w: 190, o: 0.95, d: 26 },
  { l: 64, t: 3, w: 140, o: 0.85, d: 32, delay: -8 },
  { l: 76, t: 36, w: 210, o: 0.8, d: 38, delay: -14 },
  { l: -10, t: 60, w: 150, o: 0.8, d: 30, delay: -4 },
  { l: 46, t: 72, w: 230, o: 0.7, d: 42, delay: -20 },
  { l: -8, t: 88, w: 180, o: 0.75, d: 34, delay: -10 },
];

const CLOUD_SPARKLES: Item[] = [
  { l: 28, t: 18, w: 14, d: 3.2, c: "#f2c14e" },
  { l: 86, t: 22, w: 10, d: 4.1, delay: -1.5, c: "#c8b6ff" },
  { l: 14, t: 38, w: 9, d: 3.6, delay: -2.2, c: "#c8b6ff" },
  { l: 58, t: 58, w: 12, d: 4.4, delay: -0.6, c: "#f2c14e" },
  { l: 90, t: 66, w: 9, d: 3.8, delay: -3, c: "#f2c14e" },
];

function NuvemDecor({ compact }: { compact: boolean }) {
  const clouds = compact ? CLOUDS.filter((_, i) => i % 2 === 0) : CLOUDS;
  const k = compact ? 0.32 : 1;
  return (
    <>
      {clouds.map((c, i) => (
        <Cloud
          key={i}
          className="theme-drift absolute drop-shadow-[0_8px_14px_rgba(155,123,232,0.14)]"
          style={{
            left: `${c.l}%`,
            top: `${c.t}%`,
            width: c.w * k,
            opacity: c.o,
            animationDuration: `${c.d}s`,
            animationDelay: `${c.delay ?? 0}s`,
          }}
        />
      ))}
      {!compact &&
        CLOUD_SPARKLES.map((s, i) => (
          <Sparkle
            key={i}
            color={s.c!}
            className="theme-twinkle absolute"
            style={{ left: `${s.l}%`, top: `${s.t}%`, width: s.w, animationDuration: `${s.d}s`, animationDelay: `${s.delay ?? 0}s` }}
          />
        ))}
    </>
  );
}

/* ---------- Noite estrelada ---------- */

const STARS: Item[] = [
  { l: 6, t: 6, w: 12, d: 3.1 },
  { l: 22, t: 14, w: 8, d: 4.3, delay: -1.2 },
  { l: 38, t: 4, w: 10, d: 2.7, delay: -0.4, c: "#f7e7b0" },
  { l: 55, t: 12, w: 7, d: 3.8, delay: -2.1 },
  { l: 68, t: 22, w: 14, d: 4.6, delay: -3.3, c: "#f7e7b0" },
  { l: 90, t: 30, w: 9, d: 3.4, delay: -0.9 },
  { l: 12, t: 28, w: 7, d: 2.9, delay: -1.7 },
  { l: 30, t: 36, w: 11, d: 4.1, delay: -2.6, c: "#f7e7b0" },
  { l: 80, t: 44, w: 8, d: 3.6, delay: -0.2 },
  { l: 4, t: 48, w: 10, d: 4.8, delay: -3.9 },
  { l: 46, t: 50, w: 6, d: 3.2, delay: -1.1 },
  { l: 94, t: 58, w: 12, d: 2.8, delay: -2.4, c: "#f7e7b0" },
  { l: 18, t: 64, w: 8, d: 3.9, delay: -0.7 },
  { l: 62, t: 66, w: 10, d: 4.4, delay: -3.1 },
  { l: 36, t: 76, w: 7, d: 3.3, delay: -1.9, c: "#f7e7b0" },
  { l: 86, t: 78, w: 9, d: 4.0, delay: -2.8 },
  { l: 8, t: 86, w: 12, d: 3.7, delay: -0.5 },
  { l: 52, t: 88, w: 8, d: 2.6, delay: -1.4 },
  { l: 74, t: 94, w: 10, d: 4.2, delay: -3.6, c: "#f7e7b0" },
  { l: 26, t: 94, w: 7, d: 3.5, delay: -2.2 },
];

function NoiteDecor({ compact }: { compact: boolean }) {
  const stars = compact ? STARS.filter((_, i) => i % 3 === 0) : STARS;
  const k = compact ? 0.5 : 1;
  return (
    <>
      {/* Poeira de estrelinhas estática */}
      <div className="theme-dust absolute inset-0" />
      {stars.map((s, i) => (
        <Sparkle
          key={i}
          color={s.c ?? "#ffffff"}
          className="theme-twinkle absolute drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]"
          style={{
            left: `${s.l}%`,
            top: `${s.t}%`,
            width: Math.max(4, s.w * k),
            animationDuration: `${s.d}s`,
            animationDelay: `${s.delay ?? 0}s`,
          }}
        />
      ))}
      {/* Lua crescente */}
      <svg
        viewBox="0 0 64 64"
        className="theme-float absolute drop-shadow-[0_0_24px_rgba(247,231,176,0.55)]"
        style={{ right: compact ? "8%" : "7%", top: compact ? "10%" : "8%", width: compact ? 18 : 64 }}
        aria-hidden
      >
        <path d="M40 4a28 28 0 1 0 20 44A24 24 0 1 1 40 4Z" fill="#f7e7b0" />
      </svg>
      {!compact && (
        <>
          <span className="theme-shooting absolute" style={vars({ left: "8%", top: "12%" })} />
          <span className="theme-shooting absolute" style={vars({ left: "46%", top: "30%", animationDelay: "-5.5s" })} />
        </>
      )}
    </>
  );
}

/* ---------- Jardim ---------- */

function Flower({ petal, center = "#f2c14e", className, style }: { petal: string; center?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden>
      <g fill={petal}>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="20" cy="10" rx="7" ry="10" transform={`rotate(${a} 20 20)`} />
        ))}
      </g>
      <circle cx="20" cy="20" r="6" fill={center} />
    </svg>
  );
}

function Leaf({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 60" className={className} style={style} aria-hidden>
      <path d="M20 58C4 44 2 22 20 2c18 20 16 42 0 56Z" fill={color} />
      <path d="M20 56V10" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// b = distância do rodapé (%), r = rotação base
const GARDEN: (Item & { kind: "leaf" | "flower"; b?: number })[] = [
  { kind: "leaf", l: -2, t: 0, b: -2, w: 46, r: -28, d: 5.2, c: "#8fbf84" },
  { kind: "leaf", l: 4, t: 0, b: -3, w: 60, r: 8, d: 6.1, delay: -1, c: "#6f9f6a" },
  { kind: "flower", l: 10, t: 0, b: 4, w: 34, d: 5.6, delay: -2, c: "#fffdf7" },
  { kind: "leaf", l: 15, t: 0, b: -4, w: 42, r: 30, d: 4.8, delay: -0.5, c: "#a9d19f" },
  { kind: "flower", l: 2, t: 0, b: 9, w: 26, d: 6.4, delay: -3, c: "#ffd7b5" },
  { kind: "leaf", l: 84, t: 0, b: -3, w: 58, r: -10, d: 5.9, delay: -1.6, c: "#6f9f6a" },
  { kind: "leaf", l: 93, t: 0, b: -2, w: 44, r: 26, d: 5.1, delay: -2.4, c: "#8fbf84" },
  { kind: "flower", l: 86, t: 0, b: 6, w: 32, d: 6.2, delay: -0.8, c: "#d9ccff" },
  { kind: "flower", l: 77, t: 0, b: 2, w: 24, d: 5.4, delay: -3.4, c: "#fffdf7" },
  { kind: "leaf", l: 74, t: 0, b: -4, w: 38, r: -32, d: 4.6, delay: -1.2, c: "#a9d19f" },
];

const GARDEN_TOP: (Item & { kind: "leaf" | "flower" })[] = [
  { kind: "leaf", l: 90, t: -2, w: 44, r: 200, d: 6, c: "#8fbf84" },
  { kind: "leaf", l: 82, t: -3, w: 36, r: 160, d: 5.3, delay: -2, c: "#a9d19f" },
  { kind: "flower", l: 94, t: 5, w: 22, d: 6.6, delay: -1, c: "#ffd7b5" },
  { kind: "leaf", l: 2, t: -3, w: 38, r: 190, d: 5.8, delay: -3, c: "#a9d19f" },
];

const FALLING: Item[] = [
  { l: 18, t: 0, w: 14, d: 14, delay: -2, c: "#fffdf7" },
  { l: 42, t: 0, w: 12, d: 18, delay: -9, c: "#a9d19f" },
  { l: 64, t: 0, w: 14, d: 16, delay: -5, c: "#ffd7b5" },
  { l: 88, t: 0, w: 11, d: 20, delay: -13, c: "#d9ccff" },
];

function JardimDecor({ compact }: { compact: boolean }) {
  const k = compact ? 0.4 : 1;
  const bottom = compact ? GARDEN.filter((_, i) => i % 2 === 0) : GARDEN;
  const render = (g: Item & { kind: "leaf" | "flower" }, pos: CSSProperties, i: number) => {
    const style = {
      ...pos,
      width: g.w * k,
      animationDuration: `${g.d}s`,
      animationDelay: `${g.delay ?? 0}s`,
      "--rot": `${g.r ?? 0}deg`,
    } as CSSProperties;
    return g.kind === "leaf" ? (
      <Leaf key={i} color={g.c!} className="theme-sway absolute origin-bottom" style={style} />
    ) : (
      <Flower key={i} petal={g.c!} className="theme-sway absolute" style={style} />
    );
  };
  return (
    <>
      {bottom.map((g, i) => render(g, { left: `${g.l}%`, bottom: `${g.b}%` }, i))}
      {!compact && GARDEN_TOP.map((g, i) => render(g, { left: `${g.l}%`, top: `${g.t}%` }, i + 100))}
      {!compact &&
        FALLING.map((f, i) => (
          <span
            key={i}
            className="theme-fall absolute top-0"
            style={{ left: `${f.l}%`, animationDuration: `${f.d}s`, animationDelay: `${f.delay ?? 0}s` }}
          >
            <Leaf color={f.c!} style={{ width: f.w }} />
          </span>
        ))}
    </>
  );
}

/* ---------- Componente ---------- */

export function ThemeBackdrop({
  theme,
  compact = false,
  fixed = false,
}: {
  theme: ThemeId;
  /** Versão miniatura para os botões de escolher tema. */
  compact?: boolean;
  /** Fica parado enquanto a página rola (páginas longas). */
  fixed?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`theme-backdrop pointer-events-none inset-0 -z-10 overflow-hidden ${fixed ? "fixed" : "absolute"}`}
    >
      {theme === "nuvem" && <NuvemDecor compact={compact} />}
      {theme === "noite" && <NoiteDecor compact={compact} />}
      {theme === "jardim" && <JardimDecor compact={compact} />}
    </div>
  );
}
