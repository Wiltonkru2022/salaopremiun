import Link from "next/link";
import { ArrowLeft, Ban, Clock3 } from "lucide-react";
import { bloquearHorarioProfissionalAction } from "@/app/app-profissional/agenda/actions";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

type SearchParams = Promise<{
  profissional_id?: string;
  data?: string;
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
        <Link
          href={`/app-profissional/agenda?data=${dataSelecionada}`}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700"
        >
          <ArrowLeft size={14} />
          Voltar para agenda
        </Link>

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
              <label className="block text-sm font-medium text-zinc-700">
                Profissional
                <select
                  name="profissional_id"
                  defaultValue={profissionalSelecionadoId}
                  className={inputClass()}
                  required
                >
                  {profissionaisDisponiveis.map((profissional) => (
                    <option key={profissional.id} value={profissional.id}>
                      {profissional.nome_exibicao || profissional.nome || "Profissional"}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <input type="hidden" name="profissional_id" value={session.idProfissional} />
            )}

            <div className="grid w-full min-w-0 grid-cols-1 gap-3 overflow-hidden sm:grid-cols-3">
              <label className="block w-full min-w-0 overflow-hidden text-sm font-medium text-zinc-700">
                Data
                <input
                  type="date"
                  name="data"
                  defaultValue={dataSelecionada}
                  className={nativeDateTimeClass()}
                  style={nativeDateTimeStyle}
                  required
                />
              </label>

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
