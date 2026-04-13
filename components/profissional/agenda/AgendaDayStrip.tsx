import Link from "next/link";

type Props = {
  dataSelecionada: string;
  basePath: string;
};

function addDays(dateISO: string, amount: number) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function getWeekdayShort(dateISO: string) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function getDayNumber(dateISO: string) {
  return String(Number(dateISO.slice(-2)));
}

export default function AgendaDayStrip({
  dataSelecionada,
  basePath,
}: Props) {
  const dias = Array.from({ length: 7 }).map((_, index) => {
    const deslocamento = index - 2;
    const data = addDays(dataSelecionada, deslocamento);

    return {
      data,
      diaSemana: getWeekdayShort(data),
      diaNumero: getDayNumber(data),
      ativo: data === dataSelecionada,
    };
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-3 pb-1">
        {dias.map((dia) => (
          <Link
            key={dia.data}
            href={`${basePath}?data=${dia.data}`}
            className={
              dia.ativo
                ? "flex h-[94px] w-[82px] shrink-0 flex-col items-center justify-center rounded-[2rem] bg-gradient-to-b from-[#b67d19] to-[#d9ab3f] text-white shadow-[0_14px_28px_rgba(0,0,0,0.14)]"
                : "flex h-[94px] w-[82px] shrink-0 flex-col items-center justify-center rounded-[2rem] border border-zinc-200 bg-white text-zinc-700 shadow-sm"
            }
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              {dia.diaSemana}
            </span>
            <span className="mt-1 text-[2.05rem] font-bold leading-none">
              {dia.diaNumero}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}