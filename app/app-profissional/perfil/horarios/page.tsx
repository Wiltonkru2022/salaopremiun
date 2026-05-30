import Link from "next/link";
import { ArrowLeft, CalendarClock, Save } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { salvarHorariosProfissionalAction } from "./actions";

type DiaTrabalho = {
  dia: string;
  ativo: boolean;
  inicio: string;
  fim: string;
};

type SearchParams = Promise<{
  ok?: string;
  erro?: string;
}>;

const DIAS_PADRAO: DiaTrabalho[] = [
  { dia: "segunda", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "terca", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "quarta", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "quinta", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "sexta", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "sabado", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "domingo", ativo: false, inicio: "09:00", fim: "18:00" },
];

const DIA_LABEL: Record<string, string> = {
  segunda: "Segunda",
  terca: "Terca",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sabado",
  domingo: "Domingo",
};

function normalizeDia(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeTime(value: unknown, fallback: string) {
  const raw = String(value || "").slice(0, 5);
  return /^\d{2}:\d{2}$/.test(raw) ? raw : fallback;
}

function normalizeDiasTrabalho(value: unknown): DiaTrabalho[] {
  const rows = Array.isArray(value) ? value : [];

  return DIAS_PADRAO.map((padrao) => {
    const found = rows.find(
      (item) =>
        item &&
        typeof item === "object" &&
        normalizeDia((item as Record<string, unknown>).dia as string) === padrao.dia
    ) as Record<string, unknown> | undefined;

    return {
      dia: padrao.dia,
      ativo:
        typeof found?.ativo === "boolean"
          ? found.ativo
          : padrao.ativo,
      inicio: normalizeTime(found?.inicio, padrao.inicio),
      fim: normalizeTime(found?.fim, padrao.fim),
    };
  });
}

export default async function HorariosProfissionalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireProfissionalAppContext();
  const { ok, erro } = await searchParams;

  const profissional = await runAdminOperation({
    action: "app_profissional_horarios_carregar",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("intervalo_agenda_minutos, dias_trabalho")
        .eq("id", session.idProfissional)
        .eq("id_salao", session.idSalao)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as {
        intervalo_agenda_minutos?: number | null;
        dias_trabalho?: unknown;
      } | null;
    },
  });

  const intervalo = [30, 60, 120].includes(
    Number(profissional?.intervalo_agenda_minutos || 30)
  )
    ? Number(profissional?.intervalo_agenda_minutos || 30)
    : 30;
  const dias = normalizeDiasTrabalho(profissional?.dias_trabalho);

  return (
    <ProfissionalShell
      title="Ajustar horarios"
      subtitle="Atendimento e intervalo da agenda."
    >
      <section className="space-y-4 pb-8">
        <Link
          href="/app-profissional/perfil"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-zinc-800 shadow-sm"
        >
          <ArrowLeft size={18} />
          Voltar ao perfil
        </Link>

        {ok ? (
          <div className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
            {ok}
          </div>
        ) : null}
        {erro ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {erro}
          </div>
        ) : null}

        <form
          action={salvarHorariosProfissionalAction}
          className="space-y-4"
        >
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <CalendarClock size={24} />
              </span>
              <div>
                <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                  Configuracao da agenda
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Defina de quanto em quanto tempo aparecem os horarios livres.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { value: 30, label: "30 min" },
                { value: 60, label: "1 hora" },
                { value: 120, label: "2 horas" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-black text-zinc-800 has-[:checked]:border-zinc-950 has-[:checked]:bg-zinc-950 has-[:checked]:text-white"
                >
                  <input
                    type="radio"
                    name="intervalo_agenda_minutos"
                    value={option.value}
                    defaultChecked={intervalo === option.value}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
              Horario de atendimento
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Dias desligados nao aparecem como disponiveis para agendamento.
            </p>

            <div className="mt-4 space-y-3">
              {dias.map((dia) => (
                <div
                  key={dia.dia}
                  className="rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-black text-zinc-950">
                      {DIA_LABEL[dia.dia] || dia.dia}
                    </span>
                    <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700">
                      <input
                        type="checkbox"
                        name={`${dia.dia}_ativo`}
                        defaultChecked={dia.ativo}
                        className="h-5 w-5"
                      />
                      Ativo
                    </label>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                        Inicio
                      </span>
                      <input
                        type="time"
                        name={`${dia.dia}_inicio`}
                        defaultValue={dia.inicio}
                        className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                        Fim
                      </span>
                      <input
                        type="time"
                        name={`${dia.dia}_fim`}
                        defaultValue={dia.fim}
                        className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-zinc-950 px-5 text-base font-black text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]">
            <Save size={20} />
            Salvar horarios
          </button>
        </form>
      </section>
    </ProfissionalShell>
  );
}
