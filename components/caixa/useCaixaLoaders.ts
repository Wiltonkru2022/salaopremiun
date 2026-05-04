"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import type { Permissoes } from "@/lib/auth/permissions";
import type {
  AbaCaixa,
  AgendamentoFila,
  CatalogoExtra,
  CatalogoProduto,
  CatalogoServico,
  ComandaDetalhe,
  ComandaFila,
  ComandaItem,
  ComandaPagamento,
  ConfigCaixaSalao,
  ProfissionalResumo,
} from "@/components/caixa/types";
import {
  carregarAcessoCaixa,
  carregarCatalogosCaixa,
  carregarComandaDetalhe,
  carregarConfiguracoesCaixa as carregarConfiguracoesCaixaData,
  carregarListasCaixa,
} from "@/lib/caixa/loadCaixaData";
import {
  carregarSessaoCaixa,
  type CaixaMovimentacao,
  type CaixaSessao,
} from "@/lib/caixa/sessaoCaixa";
import { monitorClientOperation } from "@/lib/monitoring/client";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/components/caixa/useCaixaApi";

type CaixaSupabaseClient = ReturnType<typeof createClient>;
type StateSetter<T> = Dispatch<SetStateAction<T>>;

type CaixaRouter = {
  replace: (href: string) => void;
};

type UseCaixaLoadersParams = {
  supabase: CaixaSupabaseClient;
  router: CaixaRouter;
  idSalao: string;
  requestedComandaId: string | null;
  setLoading: StateSetter<boolean>;
  setErroTela: StateSetter<string>;
  setMsg: StateSetter<string>;
  setIdSalao: StateSetter<string>;
  setPermissoes: StateSetter<Permissoes | null>;
  setAcessoCarregado: StateSetter<boolean>;
  setConfigCaixa: StateSetter<ConfigCaixaSalao | null>;
  setCaixaSchemaReady: StateSetter<boolean>;
  setCaixaSchemaError: StateSetter<string>;
  setSessaoCaixa: StateSetter<CaixaSessao | null>;
  setUltimaSessaoFechadaCaixa: StateSetter<CaixaSessao | null>;
  setMovimentacoesCaixa: StateSetter<CaixaMovimentacao[]>;
  setAba: StateSetter<AbaCaixa>;
  setComandasFila: StateSetter<ComandaFila[]>;
  setAgendamentosFila: StateSetter<AgendamentoFila[]>;
  setComandasFechadas: StateSetter<ComandaFila[]>;
  setComandasCanceladas: StateSetter<ComandaFila[]>;
  setComandaSelecionada: StateSetter<ComandaDetalhe | null>;
  setComandaCarregandoId: StateSetter<string | null>;
  setItens: StateSetter<ComandaItem[]>;
  setPagamentos: StateSetter<ComandaPagamento[]>;
  setDescontoInput: StateSetter<string>;
  setAcrescimoInput: StateSetter<string>;
  setServicosCatalogo: StateSetter<CatalogoServico[]>;
  setProdutosCatalogo: StateSetter<CatalogoProduto[]>;
  setExtrasCatalogo: StateSetter<CatalogoExtra[]>;
  setProfissionaisCatalogo: StateSetter<ProfissionalResumo[]>;
};

export function useCaixaLoaders({
  supabase,
  router,
  idSalao,
  requestedComandaId,
  setLoading,
  setErroTela,
  setMsg,
  setIdSalao,
  setPermissoes,
  setAcessoCarregado,
  setConfigCaixa,
  setCaixaSchemaReady,
  setCaixaSchemaError,
  setSessaoCaixa,
  setUltimaSessaoFechadaCaixa,
  setMovimentacoesCaixa,
  setAba,
  setComandasFila,
  setAgendamentosFila,
  setComandasFechadas,
  setComandasCanceladas,
  setComandaSelecionada,
  setComandaCarregandoId,
  setItens,
  setPagamentos,
  setDescontoInput,
  setAcrescimoInput,
  setServicosCatalogo,
  setProdutosCatalogo,
  setExtrasCatalogo,
  setProfissionaisCatalogo,
}: UseCaixaLoadersParams) {
  const { snapshot: painelSession } = usePainelSession();
  const limparComandaSelecionada = useCallback(() => {
    setComandaSelecionada(null);
    setItens([]);
    setPagamentos([]);
  }, [setComandaSelecionada, setItens, setPagamentos]);

  const aplicarDetalheComanda = useCallback(
    async (idComanda: string) => {
      try {
        setComandaCarregandoId(idComanda);
        const detalhe = await monitorClientOperation(
          {
            module: "caixa",
            action: "carregar_detalhe_comanda",
            screen: "caixa",
            entity: "comanda",
            entityId: idComanda,
            successMessage: "Detalhe da comanda carregado com sucesso.",
            errorMessage: "Falha ao carregar detalhe da comanda.",
          },
          () => carregarComandaDetalhe(supabase, idComanda)
        );

        setComandaSelecionada(detalhe.comandaSelecionada);
        setItens(detalhe.itens);
        setPagamentos(detalhe.pagamentos);
        setDescontoInput(detalhe.descontoInput);
        setAcrescimoInput(detalhe.acrescimoInput);
      } finally {
        setComandaCarregandoId((current) =>
          current === idComanda ? null : current
        );
      }
    },
    [
      supabase,
      setComandaSelecionada,
      setComandaCarregandoId,
      setItens,
      setPagamentos,
      setDescontoInput,
      setAcrescimoInput,
    ]
  );

  const carregarAcesso = useCallback(async () => {
    const acesso = await carregarAcessoCaixa(supabase, painelSession);

    if (acesso.precisaLogin) {
      router.replace("/login");
      return null;
    }

    setPermissoes(acesso.permissoes);
    setAcessoCarregado(true);

    if (!acesso.permissoes.caixa_ver) {
      router.replace("/dashboard");
      return null;
    }

    return acesso;
  }, [router, supabase, setPermissoes, setAcessoCarregado, painelSession]);

  const carregarConfiguracoesCaixa = useCallback(
    async (salaoIdParam?: string) => {
      const salaoId = salaoIdParam || idSalao;
      if (!salaoId) return;

      const config = await carregarConfiguracoesCaixaData(supabase, salaoId);
      setConfigCaixa(config);
    },
    [idSalao, supabase, setConfigCaixa]
  );

  const carregarSessaoOperacional = useCallback(
    async (salaoIdParam?: string) => {
      const salaoId = salaoIdParam || idSalao;
      if (!salaoId) return;

      const resultado = await carregarSessaoCaixa(supabase, salaoId);
      setCaixaSchemaReady(resultado.schemaReady);
      setCaixaSchemaError(resultado.error || "");
      setSessaoCaixa(resultado.sessao);
      setUltimaSessaoFechadaCaixa(resultado.ultimaSessaoFechada);
      setMovimentacoesCaixa(resultado.movimentacoes);
    },
    [
      idSalao,
      supabase,
      setCaixaSchemaReady,
      setCaixaSchemaError,
      setSessaoCaixa,
      setUltimaSessaoFechadaCaixa,
      setMovimentacoesCaixa,
    ]
  );

  const carregarCatalogos = useCallback(
    async (salaoIdParam?: string) => {
      const salaoId = salaoIdParam || idSalao;
      if (!salaoId) return;

      const catalogos = await carregarCatalogosCaixa(supabase, salaoId);

      setServicosCatalogo(catalogos.servicosCatalogo);
      setProdutosCatalogo(catalogos.produtosCatalogo);
      setExtrasCatalogo(catalogos.extrasCatalogo);
      setProfissionaisCatalogo(catalogos.profissionaisCatalogo);
    },
    [
      idSalao,
      supabase,
      setServicosCatalogo,
      setProdutosCatalogo,
      setExtrasCatalogo,
      setProfissionaisCatalogo,
    ]
  );

  const carregarTudo = useCallback(
    async (salaoIdParam?: string) => {
      const salaoId = salaoIdParam || idSalao;
      if (!salaoId) return;

      const listas = await carregarListasCaixa(supabase, salaoId);

      setComandasFila(listas.comandasFila);
      setAgendamentosFila(listas.agendamentosFila);
      setComandasFechadas(listas.comandasFechadas);
      setComandasCanceladas(listas.comandasCanceladas);
    },
    [
      idSalao,
      supabase,
      setComandasFila,
      setAgendamentosFila,
      setComandasFechadas,
      setComandasCanceladas,
    ]
  );

  const init = useCallback(async () => {
    try {
      setLoading(true);
      setErroTela("");
      setMsg("");

      const acesso = await monitorClientOperation(
        {
          module: "caixa",
          action: "inicializar_caixa",
          screen: "caixa",
          successMessage: "Caixa inicializado com sucesso.",
          errorMessage: "Falha ao inicializar o caixa.",
        },
        () => carregarAcesso()
      );
      if (!acesso) return;

      const salaoId = acesso.usuario.id_salao;
      setIdSalao(salaoId);

      await monitorClientOperation(
        {
          module: "caixa",
          action: "carregar_contexto_caixa",
          screen: "caixa",
          details: {
            idSalao: salaoId,
          },
          successMessage: "Contexto operacional do caixa carregado.",
          errorMessage: "Falha ao carregar contexto operacional do caixa.",
        },
        () =>
          Promise.all([
            carregarTudo(salaoId),
            carregarCatalogos(salaoId),
            carregarConfiguracoesCaixa(salaoId),
            carregarSessaoOperacional(salaoId),
          ])
      );

      if (requestedComandaId) {
        await aplicarDetalheComanda(requestedComandaId);
        setAba("fila");
      }
    } catch (error) {
      console.error(error);
      setErroTela(getErrorMessage(error, "Erro ao carregar caixa."));
    } finally {
      setLoading(false);
    }
  }, [
    requestedComandaId,
    setLoading,
    setErroTela,
    setMsg,
    carregarAcesso,
    setIdSalao,
    carregarTudo,
    carregarCatalogos,
    carregarConfiguracoesCaixa,
    carregarSessaoOperacional,
    aplicarDetalheComanda,
    setAba,
  ]);

  return {
    aplicarDetalheComanda,
    carregarCatalogos,
    carregarConfiguracoesCaixa,
    carregarSessaoOperacional,
    carregarTudo,
    init,
    limparComandaSelecionada,
  };
}
