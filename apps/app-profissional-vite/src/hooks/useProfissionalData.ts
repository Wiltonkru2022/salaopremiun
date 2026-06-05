import { useCallback, useEffect, useMemo, useState } from "react";
import { readCache, writeCache } from "../lib/cache";
import { addMinutes } from "../lib/date";
import { supabase } from "../lib/supabase";
import type { Agendamento, Avaliacao, Cliente, Comanda, ComissaoLancamento, ItemComanda, Notificacao, ProfissionalResumo, Servico } from "../types/database";

type DataState = {
  agendamentos: Agendamento[];
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

export function useProfissionalData(profissionalId?: string) {
  const cacheKey = profissionalId ? `data.${profissionalId}` : "data.empty";
  const [state, setState] = useState<DataState>(() => readCache(cacheKey, emptyState));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profissionalId) return;
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("app_profissional_dados", {
      p_profissional_id: profissionalId,
      p_mes: null,
      p_status_comissao: null
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const payload = (data || {}) as Partial<DataState>;

    const nextState: DataState = {
      agendamentos: uniqueById((payload.agendamentos ?? []) as Agendamento[]),
      clientes: uniqueById((payload.clientes ?? []) as Cliente[]),
      servicos: uniqueById((payload.servicos ?? []) as Servico[]),
      comandas: uniqueById((payload.comandas ?? []) as Comanda[]),
      itensComanda: uniqueById((payload.itensComanda ?? []) as ItemComanda[]),
      notificacoes: uniqueById((payload.notificacoes ?? []) as Notificacao[]),
      comissoes: uniqueById((payload.comissoes ?? []) as ComissaoLancamento[]),
      avaliacoes: uniqueById((payload.avaliacoes ?? []) as Avaliacao[]),
      profissionais: uniqueById((payload.profissionais ?? []) as ProfissionalResumo[])
    };

    setState(nextState);
    writeCache(cacheKey, nextState);
    setLoading(false);
  }, [profissionalId, cacheKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profissionalId) return;

    const channel = supabase
      .channel(`salaopremiun-${profissionalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos", filter: `profissional_id=eq.${profissionalId}` }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "comandas", filter: `profissional_id=eq.${profissionalId}` }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "notificacoes", filter: `profissional_id=eq.${profissionalId}` }, () => void refresh())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profissionalId, refresh]);

  const actions = useMemo(() => {
    async function confirmarAgendamento(id: string) {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_confirmar_agendamento", {
        p_profissional_id: profissionalId,
        p_agendamento_id: id
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function excluirAgendamento(id: string) {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_excluir_agenda_item", {
        p_profissional_id: profissionalId,
        p_item_id: id
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function bloquearHorario(data: string, horaInicio: string, duracaoMinutos: number, titulo = "Horario bloqueado") {
      if (!profissionalId) return;
      const { error } = await supabase.rpc("app_profissional_bloquear_horario", {
        p_profissional_id: profissionalId,
        p_data: data,
        p_hora_inicio: horaInicio,
        p_hora_fim: addMinutes(horaInicio, duracaoMinutos),
        p_motivo: titulo
      });
      if (error) throw new Error(error.message);
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
      const { error } = await supabase.rpc("app_profissional_reagendar_agendamento", {
        p_profissional_id: profissionalId,
        p_agendamento_id: payload.agendamentoId,
        p_data: payload.data,
        p_hora_inicio: payload.horaInicio,
        p_hora_fim: payload.horaFim
      });
      if (error) throw new Error(error.message);
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
      const { error } = await supabase.rpc("app_profissional_confirmar_pix", {
        p_profissional_id: profissionalId,
        p_agendamento_id: id
      });
      if (error) throw new Error(error.message);
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
      const { error } = await supabase.rpc("app_profissional_abrir_comanda", {
        p_profissional_id: profissionalId,
        p_cliente_id: clienteId,
        p_cliente_nome: clienteNome || "Consumidor Final"
      });
      if (error) throw new Error(error.message);
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
      const { error } = await supabase.rpc("app_profissional_fechar_comanda", {
        p_profissional_id: profissionalId,
        p_comanda_id: id
      });
      if (error) throw new Error(error.message);
      await refresh();
    }

    async function marcarNotificacaoLida(id: string) {
      const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
      if (error) throw new Error(error.message);
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

  return { ...state, loading, error, refresh, actions };
}


