import Link from "next/link";
import { ArrowLeft, Ban, Clock3 } from "lucide-react";
import { bloquearHorarioProfissionalAction } from "@/app/app-profissional/agenda/actions";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalSearchableFormField from "@/components/profissional/ui/ProfissionalSearchableFormField";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

type SearchParams = Promise<{
  profissional_id?: string;
  data?: string;
  datas?: string;
  hora_inicio?: string;
  hora_fim?: string;
  motivo?: string;
  erro?: string;
}>;

type ProfissionalOption = {
  id: string;
  nome?: string | null;
  nome_exibicao?: string | null;
  tipo_profissional?: string | null;
};

function hojeISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function monthDays(dateISO: string) {
  const safe = isISODate(dateISO) ? dateISO : hojeISO();
  const [year, month] = safe.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
      .format(new Date(year, month - 1, day))
      .replace(".", "");

    return { day, iso, weekday };
  });
}

function monthLabel(dateISO: string) {
  const safe = isISODate(dateISO) ? dateISO : hojeISO();
  const [year, month] = safe.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function addMonths(dateISO: string, amount: number) {
  const safe = isISODate(dateISO) ? dateISO : hojeISO();
  const [year, month] = safe.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function selectedDatesFromQuery(datas: string | undefined, fallback: string) {
  const selected = String(datas || "")
    .split(",")
    .map((item) => item.trim())
    .filter(isISODate);

  return selected.length ? selected : [fallback];
}

function buildBloquearPageUrl(
  params: Record<string, string | number | undefined | null>
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      query.set(key, String(value));
    }
  });

  return `/app-profissional/agenda/bloquear?${query.toString()}`;
}

function inputClass() {
  return "mt-2 h-12 block w-full min-w-0 max-w-full box-border rounded-[18px] border border-zinc-200 bg-white px-4 text-base outline-none transition focus:border-zinc-400";
}

function nativeDateTimeClass() {
  return `${inputClass()} sp-native-date-time appearance-none overflow-hidden text-left [color-scheme:light]`;
}

const nativeDateTimeStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  lineHeight: "48px",
  paddingTop: 0,
  paddingBottom: 0,
  WebkitAppearance: "none",
  appearance: "none",
} as const;

export default async function BloquearHorarioProfissionalPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await requireProfissionalAppContext();
  const query = searchParams ? await searchParams : {};
  const dataSelecionada = query.data || hojeISO();
  const diasDoMes = monthDays(dataSelecionada);
  const datasSelecionadas = new Set(
    selectedDatesFromQuery(query.datas, dataSelecionada)
  );
  const profissionalSelecionadoId =
    session.podeVerAgendaTodos && query.profissional_id
      ? query.profissional_id
      : session.idProfissional;

  const profissionais = await runAdminOperation({
    action: "app_profissional_agenda_bloquear_page",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabaseAdmin) => {
      const { data, error } = await supabaseAdmin
        .from("profissionais")
        .select("id, nome, nome_exibicao, tipo_profissional")
        .eq("id_salao", session.idSalao)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw new Error(error.message);

      return ((data ?? []) as ProfissionalOption[]).filter(
        (profissional) =>
          String(profissional.tipo_profissional || "profissional").toLowerCase() !==
          "assistente"
      );
    },
  });
  const profissionaisDisponiveis = session.podeVerAgendaTodos
    ? profissionais
    : profissionais.filter((profissional) => profissional.id === session.idProfissional);

  return (
    <ProfissionalShell
      title="Bloquear horário"
      subtitle="Marcar pausa, saída ou indisponibilidade"
    >
      <div className="space-y-3.5 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/app-profissional/agenda?data=${dataSelecionada}`}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700"
          >
            <ArrowLeft size={14} />
            Voltar para agenda
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={buildBloquearPageUrl({
                profissional_id: profissionalSelecionadoId,
                data: addMonths(dataSelecionada, -1),
                hora_inicio: query.hora_inicio,
                hora_fim: query.hora_fim,
                motivo: query.motivo,
              })}
              className="inline-flex h-9 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700"
            >
              Mes anterior
            </Link>
            <Link
              href={buildBloquearPageUrl({
                profissional_id: profissionalSelecionadoId,
                data: addMonths(dataSelecionada, 1),
                hora_inicio: query.hora_inicio,
                hora_fim: query.hora_fim,
                motivo: query.motivo,
              })}
              className="inline-flex h-9 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700"
            >
              Proximo
            </Link>
          </div>
        </div>

        {query.erro ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {query.erro}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
            <Ban size={14} />
            Agenda do profissional
          </div>
          <h1 className="mt-3 text-[1.45rem] font-black tracking-[-0.04em] leading-none">
            Novo bloqueio
          </h1>
          <p className="mt-2.5 text-sm leading-6 text-zinc-300">
            Use para almoço, pausa, compromisso externo ou qualquer horário sem atendimento.
          </p>
        </section>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Período bloqueado"
            description="O intervalo não aceita agendamento do cliente nem encaixe pelo profissional."
          />

          <form action={bloquearHorarioProfissionalAction} className="space-y-3.5">
            {session.podeVerAgendaTodos ? (
              <ProfissionalSearchableFormField
                name="profissional_id"
                label="Profissional"
                defaultValue={profissionalSelecionadoId}
                placeholder="Digite o nome do profissional"
                emptyText="Nenhum profissional encontrado."
                options={profissionaisDisponiveis.map((profissional) => ({
                  value: profissional.id,
                  label:
                    profissional.nome_exibicao ||
                    profissional.nome ||
                    "Profissional",
                  description: profissional.tipo_profissional || null,
                }))}
              />
            ) : (
              <input type="hidden" name="profissional_id" value={session.idProfissional} />
            )}

            <input type="hidden" name="data" value={dataSelecionada} />

            <div className="rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black capitalize text-zinc-950">
                    {monthLabel(dataSelecionada)}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Marque um ou varios dias para aplicar o mesmo bloqueio.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-zinc-600 shadow-sm">
                  Dias
                </span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {diasDoMes.map((dia) => (
                  <label
                    key={dia.iso}
                    className="group relative min-h-[4.25rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 text-left shadow-sm transition has-[:checked]:border-zinc-950 has-[:checked]:bg-zinc-950 has-[:checked]:text-white"
                  >
                    <input
                      type="checkbox"
                      name="datas"
                      value={dia.iso}
                      defaultChecked={datasSelecionadas.has(dia.iso)}
                      className="sr-only"
                    />
                    <span className="block text-[0.65rem] font-black uppercase text-zinc-400 group-has-[:checked]:text-zinc-300">
                      {dia.weekday}
                    </span>
                    <span className="mt-1 block text-xl font-black leading-none">
                      {dia.day}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid w-full min-w-0 grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2">

              <label className="block w-full min-w-0 overflow-hidden text-sm font-medium text-zinc-700">
                Início
                <input
                  type="time"
                  name="hora_inicio"
                  defaultValue={query.hora_inicio || ""}
                  className={nativeDateTimeClass()}
                  style={nativeDateTimeStyle}
                  required
                />
              </label>

              <label className="block w-full min-w-0 overflow-hidden text-sm font-medium text-zinc-700">
                Fim
                <input
                  type="time"
                  name="hora_fim"
                  defaultValue={query.hora_fim || ""}
                  className={nativeDateTimeClass()}
                  style={nativeDateTimeStyle}
                  required
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-zinc-700">
              Motivo
              <input
                type="text"
                name="motivo"
                defaultValue={query.motivo || ""}
                placeholder="Ex.: almoço, reunião, compromisso"
                className={inputClass()}
              />
            </label>

            <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-zinc-950 text-sm font-bold text-white">
              <Clock3 size={16} />
              Bloquear horário
            </button>
          </form>
        </ProfissionalSurface>
      </div>
    </ProfissionalShell>
  );
}
