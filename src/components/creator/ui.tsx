"use client";

import { useId, useRef } from "react";

export const inputClass =
  "w-full rounded-2xl border border-card-border bg-white/80 px-4 py-3 text-base text-[#3b2f4a] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`flex flex-col gap-5 rounded-[2rem] border border-card-border bg-card p-5 shadow-sm backdrop-blur sm:p-7 ${className}`}
    >
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </label>
  );
}

const VARIANTS = {
  primary: "bg-accent text-accent-fg shadow-lg shadow-black/10 hover:brightness-105",
  ghost: "bg-transparent text-fg hover:bg-black/5",
  outline: "border-2 border-card-border bg-white/60 text-fg hover:bg-white",
  danger: "bg-red-600 text-white hover:bg-red-700",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-lg font-semibold transition active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function FileField({
  label,
  hint,
  accept,
  fileName,
  onPick,
  onRemove,
  children,
}: {
  label: string;
  hint?: string;
  accept: string;
  fileName?: string;
  onPick: (file: File) => void;
  onRemove?: () => void;
  children?: React.ReactNode;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="text-base" onClick={() => inputRef.current?.click()}>
          {fileName ? "Trocar arquivo" : "Escolher arquivo"}
        </Button>
        {onRemove && (
          <Button variant="ghost" className="text-base" onClick={onRemove}>
            Remover
          </Button>
        )}
        {fileName && <span className="truncate text-sm text-muted">{fileName}</span>}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </div>
  );
}
