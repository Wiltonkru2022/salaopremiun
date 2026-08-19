import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const isPassword = props.type === "password";
  const className = `h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 font-bold outline-none focus:border-zinc-950 ${isPassword ? "pr-12" : ""} ${props.className || ""}`;

  if (!isPassword) return <input {...props} className={className} />;

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={className} />
      <button
        type="button"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        title={visible ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500"
      >
        {visible ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
    </div>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-12 rounded-2xl border border-zinc-200 bg-white px-4 font-bold outline-none focus:border-zinc-950 ${props.className || ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-24 rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-bold outline-none focus:border-zinc-950 ${props.className || ""}`} />;
}
