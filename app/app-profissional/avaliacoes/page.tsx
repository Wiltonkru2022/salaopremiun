import Link from "next/link";
import { ArrowLeft, CalendarClock, Star, Trash2 } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";
import { removerAvaliacaoProfissionalAction } from "./actions";

type ReviewRow = {
  id: string;
  nota: number;
  comentario: string | null;
  created_at: string | null;
  clientes?: { nome?: string | null } | null;
  agendamentos?:
    | {
        profissional_id?: string | null;
        data?: string | null;
        hora_inicio?: string | null;
        servicos?: { nome?: string | null } | null;
      }
    | Array<{
        profissional_id?: string | null;
        data?: string | null;
        hora_inicio?: string | null;
        servicos?: { nome?: string | null } | null;
      }>
    | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function formatDate(value?: string | null, time?: string | null) {
  if (!value) return "Data não informada";
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(`${value}T12:00:00`));
  const hour = String(time || "").slice(0, 5);
  return hour ? `${date} as ${hour}` : date;
}

async function carregarAvaliacoes(params: {
  idSalao: string;
  idProfissional: string;
}) {
  return runAdminOperation({
    action: "profissional_avaliacoes_listar",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
      const db = asLooseSupabaseClient(supabase);
      const { data, error } = await db
        .from<ReviewRow[]>("clientes_avaliacoes")
        .select(
          "id, nota, comentario, created_at, clientes(nome), agendamentos(profissional_id, data, hora_inicio, servicos(nome))"
        )
        .eq("id_salao", params.idSalao)
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) {
        throw new Error(error.message || "Erro ao carregar avaliações.");
      }

      return ((data || []) as ReviewRow[]).filter((item) => {
        const agendamento = firstRelation(item.agendamentos);
        return agendamento?.profissional_id === params.idProfissional;
      });
    },
  });
}

export default async function ProfissionalAvaliacoesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const session = await requireProfissionalAppContext();
  const params = searchParams ? await searchParams : {};
  const avaliacoes = await carregarAvaliacoes({
    idSalao: session.idSalao,
    idProfissional: session.idProfissional,
  }).catch(() => []);

  const media = avaliacoes.length
    ? avaliacoes.reduce((sum, item) => sum + Number(item.nota || 0), 0) /
      avaliacoes.length
    : null;

  return (
    <ProfissionalShell title="Avaliacoes" subtitle="Feedbacks recebidos">
      <div className="space-y-3.5">
        <Link
          href="/app-profissional/perfil"
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700"
        >
          <ArrowLeft size={17} />
          Voltar ao perfil
        </Link>

        {params?.status === "removida" ? (
          <div className="rounded-[1.15rem] border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-700">
            Avaliação removida da visualização.
          </div>
        ) : null}

        {params?.status === "erro" ? (
          <div className="rounded-[1.15rem] border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-700">
            Não foi possível remover esta avaliação agora.
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
            <Star size={14} />
            Reputacao
          </div>
          <h1 className="mt-3 text-[1.55rem] font-black tracking-[-0.04em]">
            {media ? media.toFixed(1) : "Sem nota ainda"}
          </h1>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            {avaliacoes.length
              ? `${avaliacoes.length} avaliacao(oes) recebida(s) pelos seus atendimentos.`
              : "Quando clientes avaliarem seus atendimentos, tudo aparece aqui."}
          </p>
        </section>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Recebidas"
            description="Comentarios ligados aos seus atendimentos finalizados."
          />

          <div className="space-y-3">
            {avaliacoes.length ? (
              avaliacoes.map((avaliacao) => {
                const agendamento = firstRelation(avaliacao.agendamentos);
                const servico = firstRelation(agendamento?.servicos);
                return (
                  <article
                    key={avaliacao.id}
                    className="rounded-[20px] border border-zinc-200 bg-zinc-50/80 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-zinc-950">
                          {avaliacao.clientes?.nome || "Cliente"}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-zinc-500">
                          <CalendarClock size={14} />
                          {formatDate(agendamento?.data, agendamento?.hora_inicio)}
                        </div>
                      </div>
                      <div className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                        {Number(avaliacao.nota || 0)}/5
                      </div>
                    </div>

                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                      {servico?.nome || "Atendimento"}
                    </div>

                    {avaliacao.comentario ? (
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        {avaliacao.comentario}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        Cliente avaliou sem comentario.
                      </p>
                    )}

                    <form action={removerAvaliacaoProfissionalAction} className="mt-3">
                      <input type="hidden" name="avaliacao" value={avaliacao.id} />
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-red-200 bg-white px-3 text-xs font-black text-red-600"
                      >
                        <Trash2 size={14} />
                        Remover avaliação
                      </button>
                    </form>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
                Nenhuma avaliação recebida ainda.
              </div>
            )}
          </div>
        </ProfissionalSurface>
      </div>
    </ProfissionalShell>
  );
}
