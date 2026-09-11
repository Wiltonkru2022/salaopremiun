import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

type ProfissionalRow = {
  id: string;
  ativo?: boolean | null;
};

type RegraServicoRow = {
  id_servico: string;
  preco_personalizado?: number | null;
  comissao_percentual?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
};

export function createProfissionalService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    async atualizarFoto(params: {
      idSalao: string;
      idProfissional: string;
      fotoUrl: string;
    }) {
      const { data, error } = await supabaseAdmin
        .from("profissionais")
        .update({ foto_url: params.fotoUrl, foto: params.fotoUrl })
        .eq("id", params.idProfissional)
        .eq("id_salao", params.idSalao)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error("Profissional nao encontrado.");

      return {
        idProfissional: params.idProfissional,
      };
    },

    async alterarStatus(params: {
      idSalao: string;
      idProfissional: string;
      ativo: boolean;
    }) {
      const { data, error } = await supabaseAdmin
        .from("profissionais")
        .update({
          ativo: params.ativo,
          status: params.ativo ? "ativo" : "inativo",
        })
        .eq("id", params.idProfissional)
        .eq("id_salao", params.idSalao)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error("Profissional nao encontrado.");

      if (!params.ativo) {
        await supabaseAdmin
          .from("profissionais_acessos")
          .update({ ativo: false })
          .eq("id_profissional", params.idProfissional);
      }

      return {
        idProfissional: params.idProfissional,
        ativo: params.ativo,
        status: params.ativo ? "ativo" : "inativo",
      };
    },

    async buscarExistente(params: { idSalao: string; idProfissional: string }) {
      const { data, error } = await supabaseAdmin
        .from("profissionais")
        .select("id, ativo")
        .eq("id", params.idProfissional)
        .eq("id_salao", params.idSalao)
        .maybeSingle();

      if (error) throw error;
      return (data as ProfissionalRow | null) || null;
    },

    async criar(payload: Record<string, unknown>) {
      const { data, error } = await supabaseAdmin
        .from("profissionais")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      return String(data?.id || "");
    },

    async atualizar(params: {
      idSalao: string;
      idProfissional: string;
      payload: Record<string, unknown>;
    }) {
      const { error } = await supabaseAdmin
        .from("profissionais")
        .update(params.payload)
        .eq("id", params.idProfissional)
        .eq("id_salao", params.idSalao);

      if (error) throw error;
      return params.idProfissional;
    },

    async validarServicosDoSalao(params: {
      idSalao: string;
      idsServicos: string[];
    }) {
      if (params.idsServicos.length === 0) return;

      const { data, error } = await supabaseAdmin
        .from("servicos")
        .select("id")
        .eq("id_salao", params.idSalao)
        .in("id", params.idsServicos);

      if (error) throw error;

      const idsValidos = new Set((data || []).map((item) => String(item.id)));
      const algumInvalido = params.idsServicos.some((id) => !idsValidos.has(id));

      if (algumInvalido) {
        throw new Error("Existe servico selecionado que nao pertence a este salao.");
      }
    },

    async validarAssistentesDoSalao(params: {
      idSalao: string;
      assistentes: string[];
    }) {
      if (params.assistentes.length === 0) return;

      const { data, error } = await supabaseAdmin
        .from("profissionais")
        .select("id")
        .eq("id_salao", params.idSalao)
        .eq("tipo_profissional", "assistente")
        .in("id", params.assistentes);

      if (error) throw error;

      const idsValidos = new Set((data || []).map((item) => String(item.id)));
      const algumInvalido = params.assistentes.some((id) => !idsValidos.has(id));

      if (algumInvalido) {
        throw new Error("Existe assistente selecionado que nao pertence a este salao.");
      }
    },

    async sincronizarVinculos(params: {
      idSalao: string;
      idProfissional: string;
      tipoProfissional: string;
      servicos: Array<{
        id_servico: string;
        duracao_minutos: number;
        ativo: boolean;
      }>;
      assistentes: string[];
    }) {
      const { idSalao, idProfissional, tipoProfissional, servicos, assistentes } =
        params;
      const isAssistenteSalao = tipoProfissional === "assistente";

      if (isAssistenteSalao) {
        await supabaseAdmin
          .from("profissionais_acessos")
          .update({ ativo: false })
          .eq("id_profissional", idProfissional);
      }

      const { data: vinculosAtuais, error: vinculosAtuaisError } =
        await supabaseAdmin
          .from("profissional_servicos")
          .select(
            `
              id_servico,
              preco_personalizado,
              comissao_percentual,
              comissao_assistente_percentual,
              base_calculo,
              desconta_taxa_maquininha
            `
          )
          .eq("id_salao", idSalao)
          .eq("id_profissional", idProfissional);

      if (vinculosAtuaisError) throw vinculosAtuaisError;

      const regrasAtuaisPorServico = new Map(
        ((vinculosAtuais || []) as RegraServicoRow[]).map((item) => [
          item.id_servico,
          item,
        ])
      );

      const { error: removeServicosError } = await supabaseAdmin
        .from("profissional_servicos")
        .delete()
        .eq("id_salao", idSalao)
        .eq("id_profissional", idProfissional);

      if (removeServicosError) throw removeServicosError;

      if (!isAssistenteSalao && servicos.length > 0) {
        const vinculos = servicos.map((item) => ({
          id_salao: idSalao,
          id_profissional: idProfissional,
          id_servico: item.id_servico,
          duracao_minutos: item.duracao_minutos,
          ativo: Boolean(item.ativo),
          preco_personalizado:
            regrasAtuaisPorServico.get(item.id_servico)?.preco_personalizado ??
            null,
          comissao_percentual:
            regrasAtuaisPorServico.get(item.id_servico)?.comissao_percentual ??
            null,
          comissao_assistente_percentual:
            regrasAtuaisPorServico.get(item.id_servico)
              ?.comissao_assistente_percentual ?? null,
          base_calculo:
            regrasAtuaisPorServico.get(item.id_servico)?.base_calculo ?? null,
          desconta_taxa_maquininha:
            regrasAtuaisPorServico.get(item.id_servico)
              ?.desconta_taxa_maquininha ?? null,
        }));

        const { error: insertServicosError } = await supabaseAdmin
          .from("profissional_servicos")
          .insert(vinculos);

        if (insertServicosError) throw insertServicosError;
      }

      const { error: removeAssistentesError } = await supabaseAdmin
        .from("profissional_assistentes")
        .delete()
        .eq("id_salao", idSalao)
        .eq("id_profissional", idProfissional);

      if (removeAssistentesError) throw removeAssistentesError;

      if (!isAssistenteSalao && assistentes.length > 0) {
        const vinculosAssistentes = assistentes
          .filter((idAssistente) => idAssistente !== idProfissional)
          .map((idAssistente) => ({
            id_salao: idSalao,
            id_profissional: idProfissional,
            id_assistente: idAssistente,
          }));

        if (vinculosAssistentes.length > 0) {
          const { error: insertAssistentesError } = await supabaseAdmin
            .from("profissional_assistentes")
            .insert(vinculosAssistentes);

          if (insertAssistentesError) throw insertAssistentesError;
        }
      }
    },

    async contarDependenciasExclusao(params: {
      idSalao: string;
      idProfissional: string;
    }) {
      const [
        { count: agendamentosCount, error: agendamentosError },
        { count: comandaItensCount, error: comandaItensError },
        { count: comissoesCount, error: comissoesError },
        { count: valesCount, error: valesError },
      ] = await Promise.all([
        supabaseAdmin
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", params.idSalao)
          .eq("profissional_id", params.idProfissional),
        supabaseAdmin
          .from("comanda_itens")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", params.idSalao)
          .or(
            `id_profissional.eq.${params.idProfissional},id_assistente.eq.${params.idProfissional}`
          ),
        supabaseAdmin
          .from("comissoes_lancamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", params.idSalao)
          .eq("id_profissional", params.idProfissional),
        supabaseAdmin
          .from("profissionais_vales")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", params.idSalao)
          .eq("id_profissional", params.idProfissional),
      ]);

      if (agendamentosError) throw agendamentosError;
      if (comandaItensError) throw comandaItensError;
      if (comissoesError) throw comissoesError;
      if (valesError) throw valesError;

      return {
        agendamentosCount: agendamentosCount || 0,
        comandaItensCount: comandaItensCount || 0,
        comissoesCount: comissoesCount || 0,
        valesCount: valesCount || 0,
      };
    },

    async excluir(params: { idSalao: string; idProfissional: string }) {
      const { error: acessoError } = await supabaseAdmin
        .from("profissionais_acessos")
        .delete()
        .eq("id_profissional", params.idProfissional);

      if (acessoError) throw acessoError;

      const { error: vinculoServicoError } = await supabaseAdmin
        .from("profissional_servicos")
        .delete()
        .eq("id_salao", params.idSalao)
        .eq("id_profissional", params.idProfissional);

      if (vinculoServicoError) throw vinculoServicoError;

      const { error: vinculoAssistentePrincipalError } = await supabaseAdmin
        .from("profissional_assistentes")
        .delete()
        .eq("id_salao", params.idSalao)
        .eq("id_profissional", params.idProfissional);

      if (vinculoAssistentePrincipalError) throw vinculoAssistentePrincipalError;

      const { error: vinculoAssistenteSecundarioError } = await supabaseAdmin
        .from("profissional_assistentes")
        .delete()
        .eq("id_salao", params.idSalao)
        .eq("id_assistente", params.idProfissional);

      if (vinculoAssistenteSecundarioError) throw vinculoAssistenteSecundarioError;

      const { data, error } = await supabaseAdmin
        .from("profissionais")
        .delete()
        .eq("id", params.idProfissional)
        .eq("id_salao", params.idSalao)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error("Profissional nao encontrado.");

      return {
        idProfissional: params.idProfissional,
      };
    },
  };
}

export type ProfissionalService = ReturnType<typeof createProfissionalService>;
