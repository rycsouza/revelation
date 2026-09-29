"use client";

import { useEffect, useState } from "react";
import { loadWall, postMessage } from "@/app/actions/public";
import { getDeviceId } from "@/lib/client/storage";
import type { PublicReveal, Score, WallMessage } from "@/lib/reveal/types";

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function ScoreBar({ score }: { score: Score }) {
  const total = score.boy + score.girl;
  if (total === 0) return null;
  const boyPct = Math.round((score.boy / total) * 100);
  return (
    <section className="w-full rounded-3xl bg-white/15 p-5">
      <h2 className="mb-3 text-center font-display text-xl font-semibold">Placar dos palpites da família</h2>
      <div className="flex items-center justify-between font-display text-lg font-semibold">
        <span>💙 {score.boy}</span>
        <span>{score.girl} 💗</span>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-white/20" aria-hidden>
        <div className="bg-boy-deep" style={{ width: `${boyPct}%` }} />
        <div className="flex-1 bg-girl-deep" />
      </div>
      <p className="mt-2 text-center text-sm opacity-80">
        {total} {total === 1 ? "palpite" : "palpites"}
      </p>
    </section>
  );
}

export function Wall({ reveal, authorName }: { reveal: PublicReveal; authorName?: string }) {
  const [score, setScore] = useState<Score | null>(null);
  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [author, setAuthor] = useState(authorName ?? "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadWall(reveal.slug).then((res) => {
      if (!active || !res.ok) return;
      setScore(res.score);
      setMessages(res.messages);
    });
    return () => {
      active = false;
    };
  }, [reveal.slug]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await postMessage({ slug: reveal.slug, deviceId: getDeviceId(), author, body });
    setSending(false);
    if (!res.ok) return setError(res.error);
    setMessages(res.messages);
    setBody("");
    setSent(true);
  }

  const input =
    "w-full rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-white placeholder:text-white/70 outline-none focus:ring-2 focus:ring-white";

  return (
    <div className="flex w-full flex-col gap-6">
      {reveal.guessEnabled && score && <ScoreBar score={score} />}

      <section className="w-full rounded-3xl bg-white/15 p-5">
        <h2 className="mb-4 text-center font-display text-xl font-semibold">Deixe um recado para {reveal.parents}</h2>
        {sent ? (
          <p className="text-center text-lg">Recado enviado! 💌</p>
        ) : (
          <form onSubmit={send} className="flex flex-col gap-3">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={60}
              required
              placeholder="Seu nome"
              aria-label="Seu nome"
              className={input}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              required
              rows={3}
              placeholder="Escreva algo carinhoso…"
              aria-label="Recado"
              className={`${input} resize-none`}
            />
            {error && <p className="text-sm font-semibold">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="rounded-full bg-white px-6 py-3 font-display text-lg font-semibold text-[#3b2f4a] transition active:scale-95 disabled:opacity-60"
            >
              {sending ? "Enviando…" : "Enviar recado 💌"}
            </button>
          </form>
        )}
      </section>

      {messages.length > 0 && (
        <section className="flex w-full flex-col gap-3">
          <h2 className="text-center font-display text-xl font-semibold">Mural de recados</h2>
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className="rounded-2xl bg-white/90 p-4 text-left text-[#3b2f4a] shadow">
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className="mt-2 text-sm text-[#7a6d8a]">
                  <strong>{m.author}</strong> · {timeAgo(m.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
