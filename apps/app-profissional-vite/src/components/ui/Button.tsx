import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
};

const styles = {
  primary: "bg-zinc-950 text-white active:bg-zinc-800",
  secondary: "border border-zinc-200 bg-white text-zinc-950 active:bg-zinc-50",
  danger: "border border-red-200 bg-red-50 text-red-700 active:bg-red-100",
  ghost: "bg-transparent text-zinc-700 active:bg-zinc-100"
};

export function Button({ className = "", variant = "primary", loading, children, disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition disabled:opacity-60 ${styles[variant]} ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : null}
      {children}
    </button>
  );
}
