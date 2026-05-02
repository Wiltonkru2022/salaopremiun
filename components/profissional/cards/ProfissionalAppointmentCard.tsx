type Props = {
  horario: string;
  cliente: string;
  servico: string;
  status: "confirmado" | "pendente";
};

export default function ProfissionalAppointmentCard({
  horario,
  cliente,
  servico,
  status,
}: Props) {
  const statusClasses =
    status === "confirmado"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-amber-50 text-amber-700 border border-amber-200";

  return (
    <div className="rounded-[1.2rem] border border-zinc-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-950">
            {horario}
          </div>

          <div className="mt-1 break-words text-[15px] font-semibold leading-5 text-zinc-900">
            {cliente}
          </div>

          <div className="mt-1 break-words text-sm text-zinc-500">
            {servico}
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
