import { notFound } from "next/navigation";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import ServicoProfissionalForm from "../ServicoProfissionalForm";

type PageParams = Promise<{
  id: string;
}>;

type SearchParams = Promise<{
  ok?: string;
  erro?: string;
}>;

type CategoriaOption = {
  id: string;
  nome: string | null;
};

type ServicoRow = {
  id: string;
  nome?: string | null;
  descricao?: string | null;
  id_categoria?: string | null;
  duracao_minutos?: number | null;
  pausa_minutos?: number | null;
  preco?: number | string | null;
  preco_padrao?: number | string | null;
  ativo?: boolean | null;
  app_cliente_visivel?: boolean | null;
  cobra_sinal_agendamento?: boolean | null;
  sinal_percentual_personalizado?: number | string | null;
};

export default async function EditarServicoProfissionalPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const session = await requireProfissionalAppContext();
  const { id } = await params;
  const { ok, erro } = await searchParams;

  const data = await runAdminOperation({
    action: "app_profissional_servico_editar",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const [servicoResult, vinculoResult, categoriasResult, agendamentosResult, comandaItensResult] =
        await Promise.all([
          supabase
            .from("servicos")
            .select(
              "id, nome, descricao, id_categoria, duracao_minutos, pausa_minutos, preco, preco_padrao, ativo, app_cliente_visivel, cobra_sinal_agendamento, sinal_percentual_personalizado"
            )
            .eq("id", id)
            .eq("id_salao", session.idSalao)
            .maybeSingle(),
          supabase
            .from("profissional_servicos")
            .select("id, duracao_minutos")
            .eq("id_salao", session.idSalao)
            .eq("id_profissional", session.idProfissional)
            .eq("id_servico", id)
            .maybeSingle(),
          supabase
            .from("servicos_categorias")
            .select("id, nome")
            .eq("id_salao", session.idSalao)
            .eq("ativo", true)
            .order("nome", { ascending: true }),
          supabase
            .from("agendamentos")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", session.idSalao)
            .eq("servico_id", id),
          supabase
            .from("comanda_itens")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", session.idSalao)
            .eq("id_servico", id),
        ]);

      if (servicoResult.error) throw new Error(servicoResult.error.message);
      if (vinculoResult.error) throw new Error(vinculoResult.error.message);
      if (categoriasResult.error) throw new Error(categoriasResult.error.message);
      if (agendamentosResult.error) throw new Error(agendamentosResult.error.message);
      if (comandaItensResult.error) throw new Error(comandaItensResult.error.message);

      return {
        servico: servicoResult.data as ServicoRow | null,
        vinculo: vinculoResult.data as { id?: string; duracao_minutos?: number | null } | null,
        categorias: (categoriasResult.data || []) as CategoriaOption[],
        agendamentos: agendamentosResult.count || 0,
        comandaItens: comandaItensResult.count || 0,
      };
    },
  });

  if (!data.servico?.id || !data.vinculo?.id) {
    notFound();
  }

  const servico = {
    ...data.servico,
    duracao_minutos: data.vinculo.duracao_minutos ?? data.servico.duracao_minutos,
  };
  const totalVinculos = data.agendamentos + data.comandaItens;
  const podeExcluir = totalVinculos === 0;

  return (
    <ProfissionalShell title="Editar servico" subtitle={data.servico.nome || "Cadastro"}>
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

        <ServicoProfissionalForm
          servico={servico}
          categorias={data.categorias}
          podeExcluir={podeExcluir}
          motivoBloqueioExclusao={
            podeExcluir
              ? null
              : `Nao pode excluir: existem ${data.agendamentos} agendamento(s) e ${data.comandaItens} item(ns) de comanda usando este servico.`
          }
        />
      </div>
    </ProfissionalShell>
  );
}
