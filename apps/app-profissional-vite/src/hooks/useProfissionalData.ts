import { useCallback, useEffect, useMemo, useState } from "react";
import { getCacheSavedAt, readCache, writeCache } from "../lib/cache";
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

function monthRange(monthsForward = 3) {
  const start = new Date();
  start.setDate(1);
  const end = new Date(start.getFullYear(), start.getMonth() + monthsForward, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function protectedMutation<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch("/api/app-profissional/mutacoes", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(String(data.error || "Não foi possível concluir a operação."));
  }
  return data as T;
}

export function useProfissionalData(
  profissionalId?: string,
  podeVerAgendaTodos = false,
  activeView = "inicio"
) {
  const cacheKey = profissionalId
    ? `data.v2.${profissionalId}.${podeVerAgendaTodos ? "todos" : "proprio"}`
    : "data.empty";
  const [state, setState] = useState<DataState>(() => readCache(cacheKey, emptyState));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => getCacheSavedAt(cacheKey));
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );

  const mergeState = useCallback(
    (patch: Partial<DataState>) => {
      setState((current) => {
        const next = { ...current, ...patch };
        writeCache(cacheKey, next);
        return next;
      });
      setLastSyncedAt(new Date().toISOString());
    },
    [cacheKey]
  );

  const refresh = useCallback(async () => {
    if (!profissionalId) return;
    setLoading(true);
    setError(null);

    const range = monthRange(3);
    const params = new URLSearchParams(range);
    const response = await fetch(`/api/app-profissional/data?${params.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      setError(String(data.error || "Não foi possível sincronizar os dados."));
      trackProfessionalProductivity("sincronizacao_falhou", {
        details: { message: String(data.error || response.status) },
      });
      setLoading(false);
      return;
    }

    const payload = (data || {}) as Partial<DataState>;
    mergeState({
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
    setLoading(false);
  }, [profissionalId, mergeState]);

  const refreshComandas = useCallback(async () => {
    if (!profissionalId) return;
    const range = monthRange(3);
    const response = await fetch(
      `/api/app-profissional/comandas?${new URLSearchParams(range).toString()}`,
      { credentials: "same-origin", cache: "no-store" }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(String(payload.error || "Não foi possível carregar as comandas."));
    }
    mergeState({
      comandas: uniqueById((payload.comandas || []) as Comanda[]),
      itensComanda: uniqueById((payload.itensComanda || []) as ItemComanda[]),
    });
  }, [profissionalId, mergeState]);

  const refreshComissoes = useCallback(async () => {
    if (!profissionalId) return;
    const range = monthRange(3);
    const response = await fetch(
      `/api/app-profissional/comissoes?${new URLSearchParams(range).toString()}`,
      { credentials: "same-origin", cache: "no-store" }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(String(payload.error || "Não foi possível carregar as comissões."));
    }
    mergeState({
      comissoes: uniqueById((payload.comissoes || []) as ComissaoLancamento[]),
    });
  }, [profissionalId, mergeState]);

  const refreshAvaliacoes = useCallback(async () => {
    if (!profissionalId) return;
    const response = await fetch("/api/app-profissional/avaliacoes", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(String(payload.error || "Não foi possível carregar as avaliações."));
    }
    mergeState({
      avaliacoes: uniqueById((payload.avaliacoes || []) as Avaliacao[]),
    });
  }, [profissionalId, mergeState]);

  const refreshActiveResource = useCallback(async () => {
    if (activeView === "inicio" || activeView === "comandas") {
      await refreshComandas();
      return;
    }
    if (activeView === "comissao") {
      await refreshComissoes();
      return;
    }
    if (activeView === "avaliacoes") {
      await refreshAvaliacoes();
    }
  }, [activeView, refreshAvaliacoes, refreshComandas, refreshComissoes]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refreshActiveResource().catch((resourceError) => {
      setError(
        resourceError instanceof Error
          ? resourceError.message
          : "Não foi possível atualizar esta área."
      );
    });
  }, [refreshActiveResource]);

  useEffect(() => {
    if (!profissionalId) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void refresh();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [profissionalId, podeVerAgendaTodos, refresh]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      trackProfessionalProductivity("modo_online_restaurado");
      void refresh();
      void refreshActiveResource().catch(() => undefined);
    };
    const onOffline = () => {
      setIsOnline(false);
      trackProfessionalProductivity("modo_offline_ativado");
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        void refreshActiveResource().catch(() => undefined);
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, refreshActiveResource]);

  const actions = useMemo(() => {
    async function confirmarAgendamento(id: string) {
      if (!profissionalId) return;
      const startedAt = performance.now();
      const response = await fetch("/api/app-profissional/agenda/acao", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirmar", agendamentoId: id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(String(payload.error || "Não foi possível confirmar o agendamento."));
      trackProfessionalDuration("confirmar_agendamento", performance.now() - startedAt, { entityId: id });
      trackProfessionalProductivity("agendamento_confirmado", { entityId: id });
      await refresh();
    }
    async function excluirAgendamento(id: string, _targetProfissionalId?: string) {
      if (!profissionalId) return;
      const response = await fetch("/api/app-profissional/agenda/acao", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remover", agendamentoId: id }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(String(payload.error || "Não foi possível cancelar ou excluir o item da agenda."));
      trackProfessionalProductivity(payload.kind === "bloqueio" ? "bloqueio_excluido" : "agendamento_cancelado", { entityId: id });
      await refresh();
      if (activeView === "inicio" || activeView === "comandas") await refreshComandas();
    }
    async function bloquearHorario(datas: string[], horaInicio: string, horaFim: string, titulo = "Horário bloqueado", targetProfissionalId?: string) {
      const actorId = targetProfissionalId || profissionalId;
      if (!actorId) return;
      const response = await fetch("/api/app-profissional/agenda/bloquear", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ datas: Array.from(new Set(datas.filter(Boolean))), profissionalId: actorId, horaInicio, horaFim, motivo: titulo }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(String(payload.error || "Não foi possível bloquear o horário."));
      await refresh();
    }
    async function criarAgendamento(payload: { clienteId: string; servicoId: string; data: string; horaInicio: string; profissionalId?: string }) {
      if (!profissionalId) return;
      const targetProfissionalId = payload.profissionalId || profissionalId;
      await protectedMutation("criar_agendamento", { ...payload, profissionalId: targetProfissionalId });
      try { await fetch("/api/app-profissional/agenda/auditoria-criacao", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, profissionalId: targetProfissionalId }) }); } catch {}
      await refresh();
    }
    async function reagendarAgendamento(payload: { agendamentoId: string; data: string; horaInicio: string; horaFim: string; status: string }) {
      if (!profissionalId) return;
      const response = await fetch("/api/app-profissional/agenda/acao", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reagendar", agendamentoId: payload.agendamentoId, data: payload.data, horaInicio: payload.horaInicio, horaFim: payload.horaFim }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(String(result.error || "Não foi possível reagendar o agendamento."));
      await refresh();
    }
    async function salvarCliente(payload: Pick<Cliente, "nome" | "telefone" | "observacoes">) { if (profissionalId) { await protectedMutation("criar_cliente", payload as unknown as Record<string, unknown>); await refresh(); } }
    async function editarCliente(id: string, payload: Pick<Cliente, "nome" | "telefone" | "observacoes">) { if (profissionalId) { await protectedMutation("editar_cliente", { clienteId: id, ...payload }); await refresh(); } }
    async function salvarServico(payload: Pick<Servico, "nome" | "preco" | "duracao_minutos" | "descricao">) { if (profissionalId) { await protectedMutation("criar_servico", { nome: payload.nome, preco: payload.preco, duracaoMinutos: payload.duracao_minutos, descricao: payload.descricao || null }); await refresh(); } }
    async function editarServico(id: string, payload: Pick<Servico, "nome" | "preco" | "duracao_minutos" | "descricao">) { if (profissionalId) { await protectedMutation("editar_servico", { servicoId: id, nome: payload.nome, preco: payload.preco, duracaoMinutos: payload.duracao_minutos, descricao: payload.descricao || null }); await refresh(); } }
    async function confirmarPix(id: string) { if (!profissionalId) return; const response = await fetch("/api/app-profissional/agenda/acao", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirmar_pix", agendamentoId: id }) }); const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.ok) throw new Error(String(payload.error || "Não foi possível confirmar o Pix.")); await refresh(); }
    async function trocarSenha(senha: string) { if (!profissionalId) return; const result = await protectedMutation<{ ok: true; reauthenticate?: boolean }>("trocar_senha", { senha }); if (result.reauthenticate) window.location.assign("/app-profissional/"); }
    async function excluirAvaliacao(id: string) { await protectedMutation("excluir_avaliacao", { avaliacaoId: id }); await refreshAvaliacoes(); }
    async function abrirComanda(clienteId: string | null, clienteNome: string) { if (!profissionalId) return; await protectedMutation("abrir_comanda", { clienteId, clienteNome }); await refreshComandas(); }
    async function adicionarItemComanda(comandaId: string, item: { servico_id?: string | null; nome: string; quantidade: number; valor_unitario: number; tipo?: "servico" | "produto" }) { if (!profissionalId) return; await protectedMutation("adicionar_item_comanda", { comandaId, item }); await refreshComandas(); }
    async function removerItemComanda(itemId: string) { await protectedMutation("remover_item_comanda", { itemId }); await refreshComandas(); }
    async function finalizarComanda(comandaId: string) { await protectedMutation("finalizar_comanda", { comandaId }); await refreshComandas(); await refresh(); }
    async function marcarNotificacaoLida(id: string) { await protectedMutation("marcar_notificacao_lida", { notificacaoId: id }); mergeState({ notificacoes: state.notificacoes.map((item) => item.id === id ? { ...item, lida: true } : item) }); }
    return { confirmarAgendamento, excluirAgendamento, bloquearHorario, criarAgendamento, reagendarAgendamento, salvarCliente, editarCliente, salvarServico, editarServico, confirmarPix, trocarSenha, excluirAvaliacao, abrirComanda, adicionarItemComanda, removerItemComanda, finalizarComanda, marcarNotificacaoLida };
  }, [activeView, mergeState, profissionalId, refresh, refreshAvaliacoes, refreshComandas, state.notificacoes]);

  return { ...state, loading, error, isOnline, lastSyncedAt, refresh, actions };
}
