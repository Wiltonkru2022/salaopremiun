import { useCallback, useEffect, useMemo, useState } from "react";
import { getCacheSavedAt, readCache, writeCache } from "../lib/cache";
import { supabase } from "../lib/supabase";
import {
  trackProfessionalDuration,
  trackProfessionalProductivity,
} from "../lib/product-events";
import type { Agendamento, Avaliacao, Cliente, Comanda, ComissaoLancamento, ItemComanda, Notificacao, ProfissionalResumo, Servico } from "../types/database";

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
  profissionais: []
};

function uniqueById<T extends { id: string }>(items: T[] = []) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function uniqueServices(items: Servico[] = []) {
  return Array.from(
    new Map(items.map((item) => [`${item.profissional_id}:${item.id}`, item])).values()
  );
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

  const refresh = useCallback(async () => {
    if (!profissionalId) return;
    setLoading(true);
    setError(null);

    const start = new Date();
    start.setDate(1);
    const end = new Date(start.getFullYear(), start.getMonth() + 5, 0);
    const params = new URLSearchParams({
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    });
    const response = await fetch(`/api/app-profissional/data?${params.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      setError(String(data.error || "Nao foi possivel sincronizar a agenda."));
      trackProfessionalProductivity("sincronizacao_falhou", {
        details: { message: String(data.error || response.status) },
      });
      setLoading(false);
      return;
    }

    const payload = (data || {}) as Partial<DataState>;

    const nextState: DataState = {
      agendamentos: uniqueById([
        ...((payload.agendamentos ?? []) as Agendamento[]),
        ...((payload.bloqueios ?? []) as Agendamento[]),
      ]),
      bloqueios: uniqueById((payload.bloqueios ?? []) as Agendamento[]),
      clientes: uniqueById((payload.clientes ?? []) as Cliente[]),
      servicos: uniqueServices((payload.servicos ?? []) as Servico[]),
      comandas: uniqueById((payload.comandas ?? []) as Comanda[]),
      itensComanda: uniqueById((payload.itensComanda ?? []) as ItemComanda[]),
      notificacoes: uniqueById((payload.notificacoes ?? []) as Notificacao[]),
      comissoes: uniqueById((payload.comissoes ?? []) as ComissaoLancamento[]),
      avaliacoes: uniqueById((payload.avaliacoes ?? []) as Avaliacao[]),
      profissionais: uniqueById((payload.profissionais ?? []) as ProfissionalResumo[])
    };

    setState(nextState);
    writeCache(cacheKey, nextState);
    setLastSyncedAt(new Date().toISOString());
    setLoading(false);
  }, [profissionalId, cacheKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profissionalId) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refresh(), 350);
    };
    const channel = supabase.channel(
      `salaopremiun-${profissionalId}-${podeVerAgendaTodos ? "todos" : "proprio"}`
    );
    if (podeVerAgendaTodos) {
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "comandas" }, scheduleRefresh);
    } else {
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos", filter: `profissional_id=eq.${profissionalId}` }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "comandas", filter: `profissional_id=eq.${profissionalId}` }, scheduleRefresh);
    }
    channel.subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [profissionalId, podeVerAgendaTodos, refresh]);

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
      if (!response.ok || !payload.ok) {
        throw new Error(String(payload.error || "Nao foi possivel confirmar o agendamento."));
      }
      trackProfessionalDuration("confirmar_agendamento", performance.now() - startedAt, {
        entityId: id,
      });
      trackProfessionalProductivity("agendamento_confirmado", { entityId: id });
      await refresh();
    }

    async function excluirAgendamento(id: string, targetProfissionalId?: string) {
      const actorId = targetProfissionalId || profissionalId;
      if (!actorId) return;
      const { error } = await supabase.rpc("app_profissional_excluir_agenda_item", {
        p_profissional_id: actorId,
        p_item_id: id
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function bloquearHorario(
      datas: string[],
      horaInicio: string,
      horaFim: string,
      titulo = "Horario bloqueado",
      targetProfissionalId?: string
    ) {
      const actorId = targetProfissionalId || profissionalId;
      if (!actorId) return;

      const response = await fetch("/api/app-profissional/agenda/bloquear", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datas: Array.from(new Set(datas.filter(Boolean))),
          profissionalId: actorId,
          horaInicio,
          horaFim,
          motivo: titulo,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(String(payload.error || "Nao foi possivel bloquear o horario."));
      }
      await refresh();
    }

    async function criarAgendamento(payload: { clienteId: string; servicoId: string; data: string; horaInicio: string; profissionalId?: string }) {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_criar_agendamento", {
        p_profissional_id: payload.profissionalId || profissionalId,
        p_cliente_id: payload.clienteId,
        p_servico_id: payload.servicoId,
        p_data: payload.data,
        p_hora_inicio: payload.horaInicio
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function reagendarAgendamento(payload: { agendamentoId: string; data: string; horaInicio: string; horaFim: string; status: string }) {
      if (!profissionalId) return;
      const response = await fetch("/api/app-profissional/agenda/acao", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reagendar",
          agendamentoId: payload.agendamentoId,
          data: payload.data,
          horaInicio: payload.horaInicio,
          horaFim: payload.horaFim,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(String(result.error || "Nao foi possivel reagendar o agendamento."));
      }
      trackProfessionalProductivity("agendamento_reagendado", {
        entityId: payload.agendamentoId,
        details: { data: payload.data, horaInicio: payload.horaInicio },
      });
      await refresh();
    }

    async function salvarCliente(payload: Pick<Cliente, "nome" | "telefone" | "observacoes">) {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_criar_cliente", {
        p_profissional_id: profissionalId,
        p_nome: payload.nome,
        p_telefone: payload.telefone || "",
        p_observacoes: payload.observacoes || ""
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function editarCliente(id: string, payload: Pick<Cliente, "nome" | "telefone" | "observacoes">) {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_editar_cliente", {
        p_profissional_id: profissionalId,
        p_cliente_id: id,
        p_nome: payload.nome,
        p_telefone: payload.telefone || "",
        p_observacoes: payload.observacoes || ""
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function salvarServico(payload: Pick<Servico, "nome" | "preco" | "duracao_minutos">) {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_criar_servico", {
        p_profissional_id: profissionalId,
        p_nome: payload.nome,
        p_preco: payload.preco,
        p_duracao: payload.duracao_minutos
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function editarServico(id: string, payload: Pick<Servico, "nome" | "preco" | "duracao_minutos">) {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_editar_servico", {
        p_profissional_id: profissionalId,
        p_servico_id: id,
        p_nome: payload.nome,
        p_preco: payload.preco,
        p_duracao: payload.duracao_minutos
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function confirmarPix(id: string) {
      if (!profissionalId) return;
      const response = await fetch("/api/app-profissional/agenda/acao", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirmar_pix",
          agendamentoId: id,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(String(payload.error || "Nao foi possivel confirmar o Pix."));
      }
      await refresh();
    }

    async function trocarSenha(senha: string) {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_trocar_senha", {
        p_profissional_id: profissionalId,
        p_senha: senha
      });
      if (error) throw new Error(error.message);
    }

    async function excluirAvaliacao(id: string) {
      const { error } = await supabase.rpc("app_profissional_excluir_avaliacao", {
        p_profissional_id: profissionalId,
        p_avaliacao_id: id
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function abrirComanda(clienteId: string | null, clienteNome: string) {
      if (!profissionalId) return;
      const startedAt = performance.now();
      const { error } = await supabase.rpc("app_profissional_abrir_comanda", {
        p_profissional_id: profissionalId,
        p_cliente_id: clienteId,
        p_cliente_nome: clienteNome || "Consumidor Final"
      });
      if (error) throw new Error(error.message);
      trackProfessionalDuration("abrir_comanda", performance.now() - startedAt);
      trackProfessionalProductivity("comanda_aberta", {
        details: { clienteId, clienteNome },
      });
      await refresh();
    }

    async function adicionarItemComanda(comandaId: string, item: { servico_id?: string | null; nome: string; quantidade: number; valor_unitario: number; tipo?: "servico" | "produto" }) {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_adicionar_item_comanda", {
        p_profissional_id: profissionalId,
        p_comanda_id: comandaId,
        p_servico_id: item.servico_id ?? null,
        p_nome: item.nome,
        p_quantidade: item.quantidade,
        p_valor_unitario: item.valor_unitario,
        p_tipo: item.tipo ?? "servico"
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function fecharComanda(id: string) {
      if (!profissionalId) return;
      const startedAt = performance.now();
      const { error } = await supabase.rpc("app_profissional_fechar_comanda", {
        p_profissional_id: profissionalId,
        p_comanda_id: id
      });
      if (error) throw new Error(error.message);
      trackProfessionalDuration("fechar_comanda", performance.now() - startedAt, {
        entityId: id,
      });
      trackProfessionalProductivity("comanda_finalizada", { entityId: id });
      await refresh();
    }

    async function marcarNotificacaoLida(id: string) {
      const response = await fetch("/api/app-profissional/notificacoes/read", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(String(payload.error || "Nao foi possivel marcar a notificacao como lida."));
      }
      await refresh();
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
      marcarNotificacaoLida
    };
  }, [profissionalId, refresh]);

  return { ...state, loading, error, refresh, actions, lastSyncedAt, isOnline };
}

