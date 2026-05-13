import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  dataSelecionada: string;
  basePath: string;
  diasComAtendimento?: string[];
};

function parseISODate(dateISO: string) {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(date.getFullYear(), date.getMonth(), 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildCalendarDays(monthCursor: Date, diasComAtendimento: Set<string>) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: Array<{
    key: string;
    label: string;
    date: string;
    currentMonth: boolean;
    hasAppointments: boolean;
  }> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    cells.push({
      key: `blank-${index}`,
      label: "",
      date: "",
      currentMonth: false,
      hasAppointments: false,
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const iso = formatDateISO(date);

    cells.push({
      key: iso,
      label: String(day),
      date: iso,
      currentMonth: true,
      hasAppointments: diasComAtendimento.has(iso),
    });
  }

  return cells;
}

export default function AgendaDayStrip({
  dataSelecionada,
  basePath,
  diasComAtendimento = [],
}: Props) {
  const selectedDate = parseISODate(dataSelecionada);
  const monthCursor = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  );
  const appointmentsSet = new Set(diasComAtendimento);
  const days = buildCalendarDays(monthCursor, appointmentsSet);
  const previousMonthDate = formatDateISO(addMonths(monthCursor, -1));
  const nextMonthDate = formatDateISO(addMonths(monthCursor, 1));

  return (
    <div className="mt-4">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[1.55rem] font-black capitalize tracking-[-0.04em] text-zinc-950">
          {formatMonthLabel(monthCursor)}
        </h2>
        <div className="flex gap-2">
          <Link
            href={`${basePath}?data=${previousMonthDate}`}
            aria-label="Mês anterior"
            className="flex h-12 w-12 items-center justify-center rounded-[1.05rem] border border-zinc-200 bg-white text-zinc-800 shadow-sm active:bg-zinc-50"
          >
            <ChevronLeft size={22} />
          </Link>
          <Link
            href={`${basePath}?data=${nextMonthDate}`}
            aria-label="Próximo mês"
            className="flex h-12 w-12 items-center justify-center rounded-[1.05rem] border border-zinc-200 bg-white text-zinc-800 shadow-sm active:bg-zinc-50"
          >
            <ChevronRight size={22} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[0.78rem] font-bold text-zinc-500">
        {["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((day) =>
          day.currentMonth ? (
            <Link
              key={day.key}
              href={`${basePath}?data=${day.date}`}
              className={`relative flex aspect-square min-h-11 items-center justify-center rounded-full border text-base font-bold transition ${
                dataSelecionada === day.date
                  ? "border-cyan-700 bg-cyan-50 text-zinc-950 ring-2 ring-cyan-700"
                  : day.hasAppointments
                    ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                    : "border-zinc-100 bg-white text-zinc-500"
              }`}
            >
              {day.label}
              {day.hasAppointments ? (
                <span
                  className={`absolute bottom-2 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full ${
                    dataSelecionada === day.date ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              ) : null}
            </Link>
          ) : (
            <span key={day.key} />
          )
        )}
      </div>
    </div>
  );
}
