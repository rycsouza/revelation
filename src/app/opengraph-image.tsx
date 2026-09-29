import { ImageResponse } from "next/og";

// Prévia de link neutra de propósito: vale para todas as páginas, inclusive as revelações.
export const alt = "Um envelope fechado com um coração: uma novidade para você";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          background: "linear-gradient(160deg, #fdf6ee 0%, #efe6ff 100%)",
          color: "#3b2f4a",
        }}
      >
        <svg width="360" height="240" viewBox="0 0 360 240">
          <rect x="0" y="0" width="360" height="240" rx="24" fill="#f3dcc4" />
          <path d="M8 236 L180 120 L352 236 Z" fill="#f6e2cd" />
          <path d="M8 4 L180 140 L352 4 Z" fill="#e6c19c" />
          <path
            d="M180 176 C180 176 144 150 144 126 C144 112 155 102 167 102 C174 102 178 106 180 110 C182 106 186 102 193 102 C205 102 216 112 216 126 C216 150 180 176 180 176 Z"
            fill="#f2c14e"
          />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>Uma novidade para você</div>
          <div style={{ fontSize: 36, color: "#7a6d8a" }}>Toque para abrir a surpresa</div>
        </div>
      </div>
    ),
    size,
  );
}
