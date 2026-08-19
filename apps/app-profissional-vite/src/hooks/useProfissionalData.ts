import { useCallback, useEffect, useMemo, useState } from "react";
import { clearProfessionalCache, getCacheSavedAt, readCache, writeCache } from "../lib/cache";
import { supabase } from "../lib/supabase";
import {
  trackProfessionalDuration,
  trackProfessionalProductivity,
} from "../lib/product-events";
import type {
  Agendamento,
  Avaliacao,
  Cliente,
  Comanda,
  ComissaoLancamento,
  ItemComanda,
  Notificacao,
  ProfissionalResumo,
  Servico,
} from "../types/database";

type DataState = {
  agendamentos: Agendamento[];
  bloqueios: Agendamento[];
  clientes: Cliente[];
  servicos: Servico[];
  comandas: Comanda[];
  itensComanda: ItemComanda[];
  notificacoes: Notificacao[];
  comissoes: ComissaoLancamento[];
  avaliacoes: Avaliacao[];
  profissionais: ProfissionalResumo[];
};

const emptyState: DataState = {
  agendamentos: [],
  bloqueios: [],
  clientes: [],
  servicos: [],
  comandas: [],
  itensComanda: [],
  notificacoes: [],
  comissoes: [],
  avaliacoes: [],
  profissionais: [],
};

function uniqueById<T extends { id: string }>(items: T[] = []) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function uniqueServices(items: Servico[] = []) {
  return Array.from(
    new Map(items.map((item) => [`${item.profissional_id}:${item.id}`, item])).values()
  );
}

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(String(payload?.error || "Não foi possível sincronizar os dados."));
  }
  return payload;
}

export function useProfissionalData(
  profissionalId?: string,
  podeVerAgendaTodos = false
) {
  const cacheKey = profissionalId
    ? `data.v2.${profissionalId}.${podeVerAgendaTodos ? "todos" : "proprio"}`
    : "data.empty";
  const [state, setState] = useState<DataState>(() => readCache(cacheKey, emptyState));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => getCacheSavedAt(cacheKey));
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);

  const commitPartial = useCallback(
    (partial: Partial<DataState>) => {
      setState((current) => {
        const next = { ...current, ...partial };
        writeCache(cacheKey, next);
        return next;
      });
      setLastSyncedAt(new Date().toISOString());
    },
    [cacheKey]
  );

  useEffect(() => {
    setState(readCache(cacheKey, emptyState));
    setLastSyncedAt(getCacheSavedAt(cacheKey));
  }, [cacheKey]);

  const refreshCore = useCallback(async () => {
    if (!profissionalId) return;
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const end = new Date();
    end.setDate(end.getDate() + 75);
    const params = new URLSearchParams({
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    });
    const payload = await requestJson(`/api/app-profissional/data?${params.toString()}`);
    commitPartial({
      agendamentos: uniqueById([
        ...((payload.agendamentos ?? []) as Agendamento[]),
        ...((payload.bloqueios ?? []) as Agendamento[]),
      ]),
      bloqueios: uniqueById((payload.bloqueios ?? []) as Agendamento[]),
      clientes: uniqueById((payload.clientes ?? []) as Cliente[]),
      servicos: uniqueServices((payload.servicos ?? []) as Servico[]),
      notificacoes: uniqueById((payload.notificacoes ?? []) as Notificacao[]),
      profissionais: uniqueById((payload.profissionais ?? []) as ProfissionalResumo[]),
    });
  }, [commitPartial, profissionalId]);

  const refreshComandas = useCallback(async () => {
    if (!profissionalId) return;
    const payload = await requestJson("/api/app-profissional/comandas");
    commitPartial({
      comandas: uniqueById((payload.comandas ?? []) as Comanda[]),
      itensComanda: uniqueById((payload.itensComanda ?? []) as ItemComanda[]),
    });
  }, [commitPartial, profissionalId]);

  const refreshComissoes = useCallback(async () => {
    if (!profissionalId) return;
    const payload = await requestJson("/api/app-profissional/comissoes");
    commitPartial({
      comissoes: uniqueById((payload.comissoes ?? []) as ComissaoLancamento[]),
    });
  }, [commitPartial, profissionalId]);

  const refreshAvaliacoes = useCallback(async () => {
    if (!profissionalId) return;
    const payload = await requestJson("/api/app-profissional/avaliacoes");
    commitPartial({
      avaliacoes: uniqueById((payload.avaliacoes ?? []) as Avaliacao[]),
    });
  }, [commitPartial, profissionalId]);

  const refresh = useCallback(async () => {
    if (!profissionalId) return;
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      refreshCore(),
      refreshComandas(),
      refreshComissoes(),
      refreshAvaliacoes(),
    ]);
    const failure = results.find((item): item is PromiseRejectedResult => item.status === "rejected");
    if (failure) {
      const message = failure.reason instanceof Error ? failure.reason.message : "Não foi possível sincronizar os dados.";
      setError(message);
      trackProfessionalProductivity("sincronizacao_falhou", { details: { message } });
    }
    setLoading(false);
  }, [profissionalId, refreshAvaliacoes, refreshComandas, refreshComissoes, refreshCore]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profissionalId) return;

    let agendaTimer: ReturnType<typeof setTimeout> | null = null;
    let caixaTimer: ReturnType<typeof setTimeout> | null = null;
    const refreshAgenda = () => {
      if (agendaTimer) clearTimeout(agendaTimer);
      agendaTimer = setTimeout(() => {
        void refreshCore().catch((err) => setError(err instanceof Error ? err.message : "Falha ao atualizar agenda."));
      }, 500);
    };
    const refreshCaixa = () => {
      if (caixaTimer) clearTimeout(caixaTimer);
      caixaTimer = setTimeout(() => {
        void Promise.all([refreshComandas(), refreshComissoes()]).catch((err) =>
          setError(err instanceof Error ? err.message : "Falha ao atualizar comandas.")
        );
      }, 500);
    };

    const channel = supabase.channel(
      `salaopremiun-${profissionalId}-${podeVerAgendaTodos ? "todos" : "proprio"}`
    );
    if (podeVerAgendaTodos) {
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos" }, refreshAgenda)
        .on("postgres_changes", { event: "*", schema: "public", table: "comandas" }, refreshCaixa);
    } else {
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos", filter: `profissional_id=eq.${profissionalId}` }, refreshAgenda)
        .on("postgres_changes", { event: "*", schema: "public", table: "comanda_itens", filter: `id_profissional=eq.${profissionalId}` }, refreshCaixa);
    }
    channel.subscribe();

    return () => {
      if (agendaTimer) clearTimeout(agendaTimer);
      if (caixaTimer) clearTimeout(caixaTimer);
      void supabase.removeChannel(channel);
    };
  }, [podeVerAgendaTodos, profissionalId, refreshComandas, refreshComissoes, refreshCore]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      trackProfessionalProductivity("modo_online_restaurado");
      void refresh();
    };
    const onOffline = () => {
      setIsOnline(false);
      trackProfessionalProductivity("modo_offline_ativado");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

  const actions = useMemo(() => {
    async function apiAction(action: string, body: Record<string, unknown> = {}) {
      return requestJson("/api/app-profissional/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
    }

    async function confirmarAgendamento(id: string) {
      if (!profissionalId) return;
      const startedAt = performance.now();
      await requestJson("/api/app-profissional/agenda/acao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirmar", agendamentoId: id }),
      });
      trackProfessionalDuration("confirmar_agendamento", performance.now() - startedAt, { entityId: id });
      trackProfessionalProductivity("agendamento_confirmado", { entityId: id });
      await refreshCore();
    }

    async function excluirAgendamento(id: string, _targetProfissionalId?: string) {
      if (!profissionalId) return;
      const payload = await requestJson("/api/app-profissional/agenda/acao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remover", agendamentoId: id }),
      });
      trackProfessionalProductivity(
        payload.kind === "bloqueio" ? "bloqueio_excluido" : "agendamento_cancelado",
        { entityId: id }
      );
      await refreshCore();
    }

    async function bloquearHorario(
      datas: string[],
      horaInicio: string,
      horaFim: string,
      titulo = "Horário bloqueado",
      targetProfissionalId?: string
    ) {
      const actorId = targetProfissionalId || profissionalId;
      if (!actorId) return;
      await requestJson("/api/app-profissional/agenda/bloquear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datas: Array.from(new Set(datas.filter(Boolean))),
          profissionalId: actorId,
          horaInicio,
          horaFim,
          motivo: titulo,
        }),
      });
      await refreshCore();
    }

    async function criarAgendamento(payload: {
      clienteId: string;
      servicoId: string;
      data: string;
      horaInicio: string;
      profissionalId?: string;
    }) {
      if (!profissionalId) return;
      const targetProfissionalId = payload.profissionalId || profissionalId;
      await apiAction("criar_agendamento", { ...payload, profissionalId: targetProfissionalId });
      try {
        await fetch("/api/app-profissional/agenda/auditoria-criacao", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, profissionalId: targetProfissionalId }),
        });
      } catch {
        // A criação já foi concluída; auditoria não deve duplicar o agendamento.
      }
      await refreshCore();
    }

    async function reagendarAgendamento(payload: {
      agendamentoId: string;
      data: string;
      horaInicio: string;
      horaFim: string;
      status: string;
    }) {
      await requestJson("/api/app-profissional/agenda/acao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reagendar",
          agendamentoId: payload.agendamentoId,
          data: payload.data,
          horaInicio: payload.horaInicio,
          horaFim: payload.horaFim,
        }),
      });
      trackProfessionalProductivity("agendamento_reagendado", {
        entityId: payload.agendamentoId,
        details: { data: payload.data, horaInicio: payload.horaInicio },
      });
      await refreshCore();
    }

    async function salvarCliente(payload: Pick<Cliente, "nome" | "telefone" | "observacoes">) {
      await apiAction("criar_cliente", payload);
      await refreshCore();
    }

    async function editarCliente(id: string, payload: Pick<Cliente, "nome" | "telefone" | "observacoes">) {
      await apiAction("editar_cliente", { clienteId: id, ...payload });
      await refreshCore();
    }

    async function salvarServico(payload: Pick<Servico, "nome" | "preco" | "duracao_minutos" | "descricao">) {
      await apiAction("criar_servico", {
        nome: payload.nome,
        preco: payload.preco,
        duracaoMinutos: payload.duracao_minutos,
        descricao: payload.descricao || "",
      });
      await refreshCore();
    }

    async function editarServico(
      id: string,
      payload: Pick<Servico, "nome" | "preco" | "duracao_minutos" | "descricao">
    ) {
      await apiAction("editar_servico", {
        servicoId: id,
        nome: payload.nome,
        preco: payload.preco,
        duracaoMinutos: payload.duracao_minutos,
        descricao: payload.descricao || "",
      });
      await refreshCore();
    }

    async function confirmarPix(id: string) {
      await requestJson("/api/app-profissional/agenda/acao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirmar_pix", agendamentoId: id }),
      });
      await refreshCore();
    }

    async function trocarSenha(senha: string) {
      await apiAction("trocar_senha", { senha });
      await fetch("/api/app-profissional/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      }).catch(() => null);
      clearProfessionalCache();
      window.location.assign("/app-profissional/login?senha=alterada");
    }

    async function excluirAvaliacao(id: string) {
      await apiAction("excluir_avaliacao", { avaliacaoId: id });
      await refreshAvaliacoes();
    }

    async function abrirComanda(clienteId: string | null, clienteNome: string) {
      const startedAt = performance.now();
      await apiAction("abrir_comanda", { clienteId, clienteNome });
      trackProfessionalDuration("abrir_comanda", performance.now() - startedAt);
      trackProfessionalProductivity("comanda_aberta", { details: { clienteId, clienteNome } });
      await refreshComandas();
    }

    async function adicionarItemComanda(
      comandaId: string,
      item: {
        servico_id?: string | null;
        nome: string;
        quantidade: number;
        valor_unitario: number;
        tipo?: "servico" | "produto";
      }
    ) {
      await apiAction("adicionar_item_comanda", {
        comandaId,
        servicoId: item.servico_id ?? null,
        nome: item.nome,
        quantidade: item.quantidade,
        valorUnitario: item.valor_unitario,
        tipo: item.tipo ?? "servico",
      });
      await refreshComandas();
    }

    async function fecharComanda(id: string) {
      const startedAt = performance.now();
      await apiAction("fechar_comanda", { comandaId: id });
      trackProfessionalDuration("fechar_comanda", performance.now() - startedAt, { entityId: id });
      trackProfessionalProductivity("comanda_finalizada", { entityId: id });
      await Promise.all([refreshComandas(), refreshComissoes()]);
    }

    async function marcarNotificacaoLida(id: string) {
      await requestJson("/api/app-profissional/notificacoes/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await refreshCore();
    }

    return {
      confirmarAgendamento,
      excluirAgendamento,
      bloquearHorario,
      criarAgendamento,
      reagendarAgendamento,
      salvarCliente,
      editarCliente,
      salvarServico,
      editarServico,
      confirmarPix,
      trocarSenha,
      excluirAvaliacao,
      abrirComanda,
      adicionarItemComanda,
      fecharComanda,
      marcarNotificacaoLida,
    };
  }, [
    profissionalId,
    refreshAvaliacoes,
    refreshComandas,
    refreshComissoes,
    refreshCore,
  ]);

  return { ...state, loading, error, refresh, actions, lastSyncedAt, isOnline };
}
