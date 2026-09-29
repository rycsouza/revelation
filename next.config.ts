import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy. O navegador só fala com o próprio site (connect-src 'self'):
 * nenhuma chamada direta ao Supabase, e script de terceiros não carrega.
 * 'unsafe-inline' em script é exigido pelo Next sem nonce (ver docs/SECURITY_REVIEW.md, riscos residuais).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  // canvas-confetti desenha num Web Worker criado a partir de blob:
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Permite abrir o servidor de desenvolvimento pelo celular na mesma rede Wi-Fi (http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],

  experimental: {
    serverActions: {
      // Uploads (até 4 MB) passam pelas server actions; o resto do app manda bem menos que isso.
      bodySizeLimit: "4.5mb",
    },
    // Cache de navegação no cliente: voltar para uma página dinâmica vista há menos de 30 s não pergunta ao servidor.
    staleTimes: { dynamic: 30, static: 300 },
  },

  async headers() {
    return [
      // Tudo menos /m/ (mídia), que tem uma política própria, bem mais fechada.
      { source: "/((?!m/).*)", headers: securityHeaders },
      {
        source: "/m/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
          ...securityHeaders.filter((h) => h.key !== "Content-Security-Policy"),
        ],
      },
      // Páginas do dono nunca ficam em cache compartilhado.
      { source: "/painel/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/minhas", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
