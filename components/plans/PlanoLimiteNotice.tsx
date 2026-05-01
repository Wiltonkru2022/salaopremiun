import Link from "next/link";

type Props = {
  titulo: string;
  descricao: string;
  usado: number;
  limite: number | null;
  planoNome?: string | null;
  upgradeTarget?: "pro" | "premium";
  disabled?: boolean;
  className?: string;
};

function getStatusTone(disabled: boolean, restante: number | null) {
  if (disabled) {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }

  if (restante !== null && restante <= 5) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-sky-200 bg-sky-50 text-sky-900";
}

export default function PlanoLimiteNotice({
  titulo,
  descricao,
  usado,
  limite,
  planoNome,
  upgradeTarget = "pro",
  disabled = false,
  className = "",
}: Props) {
  if (limite == null) return null;

  const restante = Math.max(limite - usado, 0);
  const tone = getStatusTone(disabled, restante);

  return (
    <div className={`rounded-3xl border px-5 py-4 ${tone} ${className}`.trim()}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
            Limite do plano {planoNome ? `- ${planoNome}` : ""}
          </div>
          <h3 className="mt-2 text-base font-bold">{titulo}</h3>
          <p className="mt-1 text-sm opacity-80">{descricao}</p>
          <p className="mt-2 text-sm font-semibold">
            {usado} de {limite} em uso
            {disabled ? " - limite atingido." : ` - restam ${restante}.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/comparar-planos"
            className="inline-flex items-center justify-center rounded-2xl border border-current/20 bg-white/80 px-4 py-2.5 text-sm font-semibold transition hover:bg-white"
          >
            Comparar planos
          </Link>
          <Link
            href={`/assinatura?plano=${upgradeTarget}`}
            className="inline-flex items-center justify-center rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Fazer upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
