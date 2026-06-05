import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-12 rounded-2xl border border-zinc-200 bg-white px-4 font-bold outline-none focus:border-zinc-950 ${props.className || ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-12 rounded-2xl border border-zinc-200 bg-white px-4 font-bold outline-none focus:border-zinc-950 ${props.className || ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-24 rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-bold outline-none focus:border-zinc-950 ${props.className || ""}`} />;
}
