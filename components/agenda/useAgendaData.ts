"use client";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { useCallback } from "react";
import { initAgendaPage } from "@/lib/agenda/initAgendaPage";
import { loadAgendaData } from "@/lib/agenda/loadAgendaData";
import { montarPayloadSincronizacao } from "@/lib/agenda/montarPayloadSincronizacao";
import { sincronizarAgendamentoComComanda } from "@/lib/agenda/sincronizarAgendamentoComComanda";
import { monitorClientOperation } from "@/lib/monitoring/client";
import type {
  Agendamento,
  Bloqueio,
  Cliente,
  ConfigSalao,
  Profissional,
  Servico,
  ViewMode,
} from "@/types/agenda";

type UseAgendaDataParams = {
  supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>;
  router: { replace: (href: string) => void };
  loadAgendaSeqRef: MutableRefObject<number>;
  idSalao: string;
  selectedProfissionalId: string;
  viewMode: ViewMode;
  currentDate: Date;
  clientes: Cliente[];
  servicos: Servico[];
  profissionais: Profissional[];
  setLoading: Dispatch<SetStateAction<boolean>>;
  setErroTela: Dispatch<SetStateAction<string>>;
  setPermissoes: Dispatch<SetStateAction<Record<string, boolean> | null>>;
  setAcessoCarregado: Dispatch<SetStateAction<boolean>>;
  setIdSalao: Dispatch<SetStateAction<string>>;
  setConfig: Dispatch<SetStateAction<ConfigSalao | null>>;
  setProfissionais: Dispatch<SetStateAction<Profissional[]>>;
  setClientes: Dispatch<SetStateAction<Cliente[]>>;
  setServicos: Dispatch<SetStateAction<Servico[]>>;
  setAssinaturaBloqueada: Dispatch<SetStateAction<boolean>>;
  setSelectedProfissionalId: Dispatch<SetStateAction<string>>;
  setAgendamentos: Dispatch<SetStateAction<Agendamento[]>>;
  setBloqueios: Dispatch<SetStateAction<Bloqueio[]>>;
};

export function useAgendaData({
  supabase,
  router,
  loadAgendaSeqRef,
  idSalao,
  selectedProfissionalId,
  viewMode,
  currentDate,
  clientes,
  servicos,
  profissionais,
  setLoading,
  setErroTela,
  setPermissoes,
  setAcessoCarregado,
  setIdSalao,
  setConfig,
  setProfissionais,
  setClientes,
  setServicos,
  setAssinaturaBloqueada,
  setSelectedProfissionalId,
  setAgendamentos,
  setBloqueios,
}: UseAgendaDataParams) {
  const isAuthLockError = useCallback((error: unknown) => {
    const message = String(
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: unknown }).message
        : error || ""
    ).toLowerCase();

    return (
      message.includes("auth-token") ||
      message.includes("navigatorlockmanager") ||
      message.includes("lock") ||
      message.includes("request was aborted") ||
      message.includes("released because another request")
    );
  }, []);

  const safeGetAuthUser = useCallback(async () => {
    try {
      const result = await supabase.auth.getUser();

      if (result.error && isAuthLockError(result.error)) {
        await new Promise((resolve) => setTimeout(resolve, 250));

        const retry = await supabase.auth.getUser();
        if (!retry.error && retry.data.user) {
          return retry.data.user;
        }

        const sessionRes = await supabase.auth.getSession();
        return sessionRes.data.session?.user || null;
      }

      if (result.error) {
        throw result.error;
      }

      return result.data.user || null;
    } catch (error: unknown) {
      if (isAuthLockError(error)) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 250));
          const sessionRes = await supabase.auth.getSession();
          return sessionRes.data.session?.user || null;
        } catch {
          return null;
        }
      }

      throw error;
    }
  }, [isAuthLockError, supabase]);

  const sincronizarAgendamento = useCallback(
    async (params: {
      idAgendamento: string;
      idComandaNova: string | null;
      idServico: string;
      idProfissional: string;
    }) => {
      if (!idSalao) {
        throw new Error("SalÃ£o nÃ£o identificado para sincronizaÃ§Ã£o.");
      }

      const { servico, profissional } = montarPayloadSincronizacao({
        servicos,
        profissionais,
        idServico: params.idServico,
        idProfissional: params.idProfissional,
      });

      await sincronizarAgendamentoComComanda({
        supabase,
        idSalao,
        idAgendamento: params.idAgendamento,
        idComandaNova: params.idComandaNova,
        idServico: params.idServico,
        idProfissional: params.idProfissional,
        servico,
        profissional,
      });
    },
    [idSalao, profissionais, servicos, supabase]
  );

  const loadAgenda = useCallback(async () => {
    if (!idSalao || !selectedProfissionalId) return;

    const requestId = ++loadAgendaSeqRef.current;

    try {
      const data = await monitorClientOperation(
        {
          module: "agenda",
          action: "carregar_agenda",
          screen: "agenda",
          details: {
            idSalao,
            profissionalId: selectedProfissionalId,
            viewMode,
            currentDate: currentDate.toISOString(),
          },
          successMessage: "Agenda carregada com sucesso.",
          errorMessage: "Falha ao carregar a agenda.",
        },
        () =>
          loadAgendaData({
            supabase,
            idSalao,
            selectedProfissionalId,
            viewMode,
            currentDate,
            clientes,
            servicos,
          })
      );

      if (requestId !== loadAgendaSeqRef.current) return;

      setAgendamentos(data.agendamentos);
      setBloqueios(data.bloqueios);
      setErroTela("");
    } catch (error: unknown) {
      if (requestId !== loadAgendaSeqRef.current) return;

      console.error("Erro ao atualizar agenda:", error);
      setErroTela("Nao foi possivel atualizar a agenda agora.");
    }
  }, [
    clientes,
    currentDate,
    idSalao,
    loadAgendaSeqRef,
    selectedProfissionalId,
    servicos,
    setAgendamentos,
    setBloqueios,
    setErroTela,
    supabase,
    viewMode,
  ]);

  const init = useCallback(async () => {
    setLoading(true);
    setErroTela("");

    try {
      const result = await monitorClientOperation(
        {
          module: "agenda",
          action: "inicializar_agenda",
          screen: "agenda",
          successMessage: "Agenda inicializada com sucesso.",
          errorMessage: "Falha ao inicializar a agenda.",
        },
        () =>
          initAgendaPage({
            supabase,
            safeGetAuthUser,
          })
      );

      if (!result.ok) {
        setErroTela(result.erroTela || "Erro ao carregar agenda.");
        setAcessoCarregado(true);
        if (result.redirectTo) {
          router.replace(result.redirectTo);
        }
        return;
      }

      if (result.redirectTo) {
        router.replace(result.redirectTo);
        return;
      }

      setPermissoes(result.permissoes || null);
      setAcessoCarregado(true);
      setIdSalao(result.idSalao || "");
      setConfig(result.config || null);
      setProfissionais(result.profissionais || []);
      setClientes(result.clientes || []);
      setServicos(result.servicos || []);
      setAssinaturaBloqueada(Boolean(result.assinaturaBloqueada));
      setErroTela(result.erroTela || "");

      if (result.profissionais?.length) {
        setSelectedProfissionalId(result.profissionais[0].id);
      }
    } catch (error: unknown) {
      console.error("Erro ao inicializar agenda:", error);
      setErroTela(error instanceof Error ? error.message : "Erro ao carregar agenda.");
      setAcessoCarregado(true);
    } finally {
      setLoading(false);
    }
  }, [
    router,
    safeGetAuthUser,
    setAcessoCarregado,
    setAssinaturaBloqueada,
    setClientes,
    setConfig,
    setErroTela,
    setIdSalao,
    setLoading,
    setPermissoes,
    setProfissionais,
    setSelectedProfissionalId,
    setServicos,
    supabase,
  ]);

  return {
    safeGetAuthUser,
    sincronizarAgendamento,
    loadAgenda,
    init,
  };
}
