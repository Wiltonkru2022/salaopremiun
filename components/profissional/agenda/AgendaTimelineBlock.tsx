import Link from "next/link";

type Props = {
  id: string;
  idComanda?: string | null;
  horario: string;
  horaFim: string;
  cliente: string;
  servico: string;
  status: string;
  top: number;
  height: number;
};

function getStatusClasses(status: string) {
  const valor = String(status || "").toLowerCase();

  if (["confirmado"].includes(valor)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (["atendido"].includes(valor)) {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  if (["em_atendimento"].includes(valor)) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (["aguardando_pagamento"].includes(valor)) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (["pendente"].includes(valor)) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (["cancelado", "faltou"].includes(valor)) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

function getStatusLabel(status: string) {
  const valor = String(status || "").toLowerCase();

  if (valor === "confirmado") return "Confirmado";
  if (valor === "em_atendimento") return "Em atendimento";
  if (valor === "atendido") return "Atendido";
  if (valor === "aguardando_pagamento") return "Aguardando pagamento";
  if (valor === "pendente") return "Pendente";
  if (valor === "faltou") return "Nao compareceu";
  if (valor === "cancelado") return "Cancelado";

  return status;
}

export default function AgendaTimelineBlock({
  id,
  horario,
  horaFim,
  cliente,
  servico,
  status,
  top,
  height,
}: Props) {
  const href = `/app-profissional/agenda/${id}`;

  return (
    <Link
      href={href}
      className="absolute left-[76px] right-0 block"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <div className="h-full rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm transition active:scale-[0.99]">
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[1.05rem] font-semibold leading-6 text-zinc-950">
                {cliente}
              </div>
              <div className="mt-1 text-sm text-zinc-500">{servico}</div>
            </div>

            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                status
              )}`}
            >
              {getStatusLabel(status)}
            </span>
          </div>

          <div className="text-xs font-medium text-zinc-400">
            {horario} às {horaFim}
          </div>
        </div>
      </div>
    </Link>
  );
}
