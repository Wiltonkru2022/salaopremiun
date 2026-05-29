import Link from "next/link";
import { Plus, Scissors } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalEmptyState from "@/components/profissional/ui/ProfissionalEmptyState";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalStatusPill from "@/components/profissional/ui/ProfissionalStatusPill";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

type SearchParams = Promise<{
  ok?: string;
  erro?: string;
}>;

type ServicoLinkedRow = {
  id_servico: string;
  duracao_minutos?: number | null;
  preco_personalizado?: number | string | null;
  servicos?: {
    id: string;
    nome?: string | null;
    descricao?: string | null;
    ativo?: boolean | null;
    status?: string | null;
    app_cliente_visivel?: boolean | null;
    duracao_minutos?: number | null;
    preco?: number | string | null;
    preco_padrao?: number | string | null;
  } | null;
};

function formatarMoeda(valor: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function duracaoServico(vinculo: ServicoLinkedRow, servico: ServicoLinkedRow["servicos"]) {
  const duracaoVinculo = Number(vinculo.duracao_minutos || 0);
  const duracaoServico = Number(servico?.duracao_minutos || 0);
  return duracaoVinculo > 0 ? duracaoVinculo : duracaoServico > 0 ? duracaoServico : 60;
}

export default async function ServicosProfissionalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireProfissionalAppContext();
  const { ok, erro } = await searchParams;

  const rows = await runAdminOperation({
    action: "app_profissional_servicos_listar",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const { data, error } = await (supabase as any)
        .from("profissional_servicos")
        .select(
          "id_servico, duracao_minutos, preco_personalizado, servicos(id, nome, descricao, ativo, status, app_cliente_visivel, duracao_minutos, preco, preco_padrao)"
        )
        .eq("id_salao", session.idSalao)
        .eq("id_profissional", session.idProfissional)
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as ServicoLinkedRow[];
    },
  });

  const servicos = rows
    .map((row) => ({
      vinculo: row,
      servico: row.servicos,
    }))
    .filter((item) => item.servico?.id);

  return (
    <ProfissionalShell title="Servicos" subtitle="Cadastro do profissional">
      <div className="space-y-3.5">
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

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Meus servicos"
            description="Somente os servicos vinculados ao seu profissional aparecem aqui."
            action={
              <Link
                href="/app-profissional/servicos/novo"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[18px] bg-zinc-950 px-4 text-sm font-bold text-white"
              >
                <Plus size={16} />
                Novo
              </Link>
            }
          />
        </ProfissionalSurface>

        {servicos.length ? (
          <div className="space-y-2.5">
            {servicos.map(({ vinculo, servico }) => {
              const ativo = servico?.ativo !== false && servico?.status !== "inativo";
              const preco = vinculo.preco_personalizado ?? servico?.preco_padrao ?? servico?.preco ?? 0;
              const duracao = duracaoServico(vinculo, servico);

              return (
                <ProfissionalSurface key={servico?.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                        <Scissors size={14} />
                        {duracao} min
                      </div>
                      <h2 className="mt-1.5 text-lg font-black tracking-[-0.04em] text-zinc-950">
                        {servico?.nome || "Servico"}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        {servico?.descricao || "Sem descricao."}
                      </p>
                      <div className="mt-2 text-sm font-black text-zinc-950">
                        {formatarMoeda(preco)}
                      </div>
                    </div>
                    <ProfissionalStatusPill
                      label={ativo ? "Ativo" : "Inativo"}
                      tone={ativo ? "success" : "danger"}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/app-profissional/servicos/${servico?.id}`}
                      className="inline-flex h-9 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700"
                    >
                      Editar
                    </Link>
                    {servico?.app_cliente_visivel ? (
                      <span className="inline-flex h-9 items-center rounded-full bg-emerald-50 px-3 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
                        No app cliente
                      </span>
                    ) : null}
                  </div>
                </ProfissionalSurface>
              );
            })}
          </div>
        ) : (
          <ProfissionalEmptyState
            title="Nenhum servico vinculado"
            description="Cadastre o primeiro servico ou peça para vincular no painel do salao."
            action={
              <Link
                href="/app-profissional/servicos/novo"
                className="inline-flex h-10 items-center justify-center rounded-[18px] bg-zinc-950 px-4 text-sm font-bold text-white"
              >
                Criar servico
              </Link>
            }
          />
        )}
      </div>
    </ProfissionalShell>
  );
}
