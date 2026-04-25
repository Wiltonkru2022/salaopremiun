type Props = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const TONE_CLASSES: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "border-zinc-200 bg-zinc-100 text-zinc-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

export default function ProfissionalStatusPill({
  label,
  tone = "neutral",
}: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
