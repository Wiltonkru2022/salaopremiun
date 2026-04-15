"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AgendaToolbar from "@/components/agenda/AgendaToolbar";
import AgendaGrid from "@/components/agenda/AgendaGrid";
import AgendaModal from "@/components/agenda/AgendaModal";
import ProfissionaisBar from "@/components/agenda/ProfissionaisBar";
import AgendaNoticeDialog from "@/components/agenda/AgendaNoticeDialog";
import AgendaConfirmDialog from "@/components/agenda/AgendaConfirmDialog";
import AgendaReasonDialog from "@/components/agenda/AgendaReasonDialog";
import type { ComandaResumo } from "@/components/agenda/page-types";
import { useAgendaFeedback } from "@/components/agenda/useAgendaFeedback";
import { cancelarAgendamentoComComanda } from "@/lib/agenda/cancelarAgendamentoComComanda";
import {
  buscarComandasAbertasDoClienteAgenda,
  criarNovaComandaAgenda,
} from "@/lib/agenda/comandasAgenda";
import { montarPayloadSincronizacao } from "@/lib/agenda/montarPayloadSincronizacao";
import { sincronizarAgendamentoComComanda } from "@/lib/agenda/sincronizarAgendamentoComComanda";
import { ensureDiaFuncionamento, getProfessionalAutoBloqueios, validateAgendaTimeRange } from "@/lib/agenda/validacoesAgenda";
import { loadAgendaData } from "@/lib/agenda/loadAgendaData";
import { initAgendaPage } from "@/lib/agenda/initAgendaPage";
import { saveAgendaItem } from "@/lib/agenda/saveAgendaItem";
import { mergeBloqueios } from "@/lib/utils/agenda";
import { formatFullDate } from "@/lib/utils/agenda";
import {
  Agendamento,
  Bloqueio,
  Cliente,
  ConfigSalao,
  Profissional,
  Servico,
  ViewMode,
} from "@/types/agenda";
import { normalizeTimeString, overlaps, sanitizeDiasFuncionamento } from "@/lib/utils/agenda";

function addMinutesToTime(time: string, minutes: number) {
  const normalized = normalizeTimeString(time);
  const [hours, mins] = normalized.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;

  return normalizeTimeString(
    `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
      totalMinutes % 60
    ).padStart(2, "0")}`
  );
}

export default function AgendaPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const loadAgendaSeqRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [erroTela, setErroTela] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [idSalao, setIdSalao] = useState("");
  const [agendaExpanded, setAgendaExpanded] = useState(false);

  const [permissoes, setPermissoes] = useState<Record<string, boolean> | null>(null);
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const [config, setConfig] = useState<ConfigSalao | null>(null);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);

  const [selectedProfissionalId, setSelectedProfissionalId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"agendamento" | "bloqueio">("agendamento");
  const [editingItem, setEditingItem] = useState<Agendamento | null>(null);
  const [editingBlock, setEditingBlock] = useState<Bloqueio | null>(null);

  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState("08:00");

  const [assinaturaBloqueada, setAssinaturaBloqueada] = useState(false);

  const {
    avisoModal,
    confirmModal,
    motivoModal,
    confirmLoading,
    motivoLoading,
    abrirAviso,
    fecharAviso,
    abrirConfirmacao,
    fecharConfirmacao,
    executarConfirmacao,
    abrirMotivoExclusao,
    fecharMotivo,
    executarMotivo,
    setMotivoValor,
  } = useAgendaFeedback({
    onRedirect: (path) => router.push(path),
  });

  function bloquearSeAssinaturaInvalida() {
    if (!assinaturaBloqueada) return false;

    abrirAviso(
      "Assinatura bloqueada",
      "Sua assinatura está bloqueada por atraso. Regularize o pagamento para continuar usando a agenda.",
      "danger",
      "/assinatura"
    );

    return true;
  }

  function isAuthLockError(error: unknown) {
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
  }

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
    } catch (error) {
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
  }, [supabase]);

  const sincronizarAgendamento = useCallback(
    async (params: {
      idAgendamento: string;
      idComandaNova: string | null;
      idServico: string;
      idProfissional: string;
    }) => {
      if (!idSalao) {
        throw new Error("Salão não identificado para sincronização.");
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
    [supabase, idSalao, servicos, profissionais]
  );

  const loadAgenda = useCallback(async () => {
    if (!idSalao || !selectedProfissionalId) return;

    const requestId = ++loadAgendaSeqRef.current;

    try {
      const data = await loadAgendaData({
        supabase,
        idSalao,
        selectedProfissionalId,
        viewMode,
        currentDate,
        clientes,
        servicos,
      });

      if (requestId !== loadAgendaSeqRef.current) return;

      setAgendamentos(data.agendamentos);
      setBloqueios(data.bloqueios);
      setErroTela("");
    } catch (error) {
      if (requestId !== loadAgendaSeqRef.current) return;

      console.error("Erro ao atualizar agenda:", error);
      setErroTela("Nao foi possivel atualizar a agenda agora.");
    }
  }, [supabase, idSalao, selectedProfissionalId, viewMode, currentDate, clientes, servicos]);

  const init = useCallback(async () => {
    setLoading(true);
    setErroTela("");

    try {
      const result = await initAgendaPage({
        supabase,
        safeGetAuthUser,
      });

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
    } catch (error) {
      console.error("Erro ao inicializar agenda:", error);
      setErroTela(error instanceof Error ? error.message : "Erro ao carregar agenda.");
      setAcessoCarregado(true);
    } finally {
      setLoading(false);
    }
  }, [supabase, safeGetAuthUser, router]);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (idSalao && selectedProfissionalId) {
      void loadAgenda();
    }
  }, [idSalao, selectedProfissionalId, loadAgenda]);

  async function buscarComandasAbertasDoCliente(
    clienteId: string
  ): Promise<ComandaResumo[]> {
    return buscarComandasAbertasDoClienteAgenda({
      supabase,
      idSalao,
      clienteId,
    });
  }

  async function criarNovaComanda(clienteId: string): Promise<ComandaResumo> {
    if (bloquearSeAssinaturaInvalida()) {
      throw new Error("Assinatura bloqueada.");
    }

    return criarNovaComandaAgenda({
      supabase,
      idSalao,
      clienteId,
    });
  }

  function openCreateModal(date: string, time: string) {
    if (bloquearSeAssinaturaInvalida()) return;

    if (!ensureDiaFuncionamento({ config, dateString: date })) {
      abrirAviso(
        "Dia indisponível",
        "Esse dia não está configurado como dia de funcionamento.",
        "warning"
      );
      return;
    }

    setSelectedDate(date);
    setSelectedTime(time);
    setEditingItem(null);
    setEditingBlock(null);
    setModalMode("agendamento");
    setModalOpen(true);
  }

  function openBlockModal(date: string, time: string) {
    if (bloquearSeAssinaturaInvalida()) return;

    if (!ensureDiaFuncionamento({ config, dateString: date })) {
      abrirAviso(
        "Dia indisponível",
        "Esse dia não está configurado como dia de funcionamento.",
        "warning"
      );
      return;
    }

    setSelectedDate(date);
    setSelectedTime(time);
    setEditingItem(null);
    setEditingBlock(null);
    setModalMode("bloqueio");
    setModalOpen(true);
  }

  function openEditModal(item: Agendamento) {
    if (bloquearSeAssinaturaInvalida()) return;

    setEditingItem(item);
    setEditingBlock(null);
    setModalMode("agendamento");
    setModalOpen(true);
  }

  function handleEditBlock(block: Bloqueio) {
    if (bloquearSeAssinaturaInvalida()) return;

    setEditingItem(null);
    setEditingBlock(block);
    setModalMode("bloqueio");
    setModalOpen(true);
  }

  async function handleSave(payload: Record<string, unknown>) {
    if (bloquearSeAssinaturaInvalida()) return;
    if (!config || !idSalao) return;

    try {
      await saveAgendaItem({
        supabase,
        payload,
        idSalao,
        config,
        bloqueios,
        agendamentos,
        profissionais,
        servicos,
        ensureDiaFuncionamentoFn: (dateString: string) =>
          ensureDiaFuncionamento({ config, dateString }),
        getProfessionalAutoBloqueiosFn: (profissionalId: string, date: string) =>
          getProfessionalAutoBloqueios({
            profissionais,
            idSalao,
            config,
            profissionalId,
            date,
          }),
        validateAgendaTimeRangeFn: (params) =>
          validateAgendaTimeRange({
            config,
            profissionais,
            getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
              getProfessionalAutoBloqueios({
                profissionais,
                idSalao,
                config,
                profissionalId,
                date,
              }),
            ...params,
          }),
        sincronizarAgendamentoFn: sincronizarAgendamento,
      });

      setModalOpen(false);
      setEditingItem(null);
      setEditingBlock(null);
      await loadAgenda();
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Erro",
        error instanceof Error ? error.message : "Erro ao salvar item da agenda.",
        "danger"
      );
    }
  }

  async function handleResizeEvent(item: Agendamento, newDuration: number) {
    if (bloquearSeAssinaturaInvalida()) return;
    if (!config) return;

    const startTime = normalizeTimeString(item.hora_inicio);
    const novoFim = addMinutesToTime(startTime, newDuration);

    const validRange = validateAgendaTimeRange({
      config,
      profissionais,
      getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
        getProfessionalAutoBloqueios({
          profissionais,
          idSalao,
          config,
          profissionalId,
          date,
        }),
      profissionalId: item.profissional_id,
      date: item.data,
      horaInicio: startTime,
      horaFim: novoFim,
    });

    if (!validRange.ok) {
      abrirAviso("Horário inválido", validRange.message, "warning");
      return;
    }

    const bloqueiosTotais = mergeBloqueios(
      bloqueios.filter((b) => b.data === item.data && b.profissional_id === item.profissional_id),
      getProfessionalAutoBloqueios({
        profissionais,
        idSalao,
        config,
        profissionalId: item.profissional_id,
        date: item.data,
      })
    );

    const conflitoBloqueio = bloqueiosTotais.some((b) =>
      overlaps(startTime, novoFim, b.hora_inicio, b.hora_fim)
    );

    if (conflitoBloqueio) {
      abrirAviso(
        "Conflito com bloqueio",
        "Não foi possível redimensionar por conflito com bloqueio.",
        "warning"
      );
      return;
    }

    const agendamentosAntes = agendamentos;
    const updatedAt = new Date().toISOString();
    loadAgendaSeqRef.current += 1;
    setAgendamentos((prev) =>
      prev.map((agendamento) =>
        agendamento.id === item.id
          ? {
              ...agendamento,
              duracao_minutos: newDuration,
              hora_fim: novoFim,
              updated_at: updatedAt,
            }
          : agendamento
      )
    );

    const { error } = await supabase
      .from("agendamentos")
      .update({
        duracao_minutos: newDuration,
        hora_fim: novoFim,
        updated_at: updatedAt,
      })
      .eq("id", item.id);

    if (error) {
      setAgendamentos(agendamentosAntes);
      console.error(error);
      abrirAviso("Erro", "Erro ao atualizar duração.", "danger");
      return;
    }

    if (item.id_comanda) {
      try {
        await sincronizarAgendamento({
          idAgendamento: item.id,
          idComandaNova: item.id_comanda,
          idServico: item.servico_id,
          idProfissional: item.profissional_id,
        });
      } catch (error) {
        console.error("Erro ao sincronizar comanda do agendamento:", error);
        abrirAviso(
          "Agenda atualizada",
          "A agenda foi atualizada, mas a comanda vinculada precisa ser conferida.",
          "warning"
        );
      }
    }

    void loadAgenda();
  }

  async function handleMoveEvent(item: Agendamento, move: { newDate: string; newStartTime: string }) {
    if (bloquearSeAssinaturaInvalida()) return;
    if (!config) return;

    if (!ensureDiaFuncionamento({ config, dateString: move.newDate })) {
      abrirAviso(
        "Dia indisponível",
        "Esse dia não está configurado como dia de funcionamento.",
        "warning"
      );
      return;
    }

    const startTime = normalizeTimeString(move.newStartTime);
    const novoFim = addMinutesToTime(startTime, item.duracao_minutos);

    const validRange = validateAgendaTimeRange({
      config,
      profissionais,
      getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
        getProfessionalAutoBloqueios({
          profissionais,
          idSalao,
          config,
          profissionalId,
          date,
        }),
      profissionalId: item.profissional_id,
      date: move.newDate,
      horaInicio: startTime,
      horaFim: novoFim,
    });

    if (!validRange.ok) {
      abrirAviso("Horário inválido", validRange.message, "warning");
      return;
    }

    const bloqueiosTotais = mergeBloqueios(
      bloqueios.filter((b) => b.data === move.newDate && b.profissional_id === item.profissional_id),
      getProfessionalAutoBloqueios({
        profissionais,
        idSalao,
        config,
        profissionalId: item.profissional_id,
        date: move.newDate,
      })
    );

    const conflitoBloqueio = bloqueiosTotais.some((b) =>
      overlaps(startTime, novoFim, b.hora_inicio, b.hora_fim)
    );

    if (conflitoBloqueio) {
      abrirAviso(
        "Conflito com bloqueio",
        "Não foi possível mover por conflito com bloqueio.",
        "warning"
      );
      return;
    }

    const agendamentosAntes = agendamentos;
    const updatedAt = new Date().toISOString();
    loadAgendaSeqRef.current += 1;
    setAgendamentos((prev) =>
      prev.map((agendamento) =>
        agendamento.id === item.id
          ? {
              ...agendamento,
              data: move.newDate,
              hora_inicio: startTime,
              hora_fim: novoFim,
              updated_at: updatedAt,
            }
          : agendamento
      )
    );

    const { error } = await supabase
      .from("agendamentos")
      .update({
        data: move.newDate,
        hora_inicio: startTime,
        hora_fim: novoFim,
        updated_at: updatedAt,
      })
      .eq("id", item.id);

    if (error) {
      setAgendamentos(agendamentosAntes);
      console.error(error);
      abrirAviso("Erro", "Erro ao mover agendamento.", "danger");
      return;
    }

    if (item.id_comanda) {
      try {
        await sincronizarAgendamento({
          idAgendamento: item.id,
          idComandaNova: item.id_comanda,
          idServico: item.servico_id,
          idProfissional: item.profissional_id,
        });
      } catch (error) {
        console.error("Erro ao sincronizar comanda do agendamento:", error);
        abrirAviso(
          "Agenda atualizada",
          "O agendamento foi movido, mas a comanda vinculada precisa ser conferida.",
          "warning"
        );
      }
    }

    void loadAgenda();
  }

  async function handleDeleteEvent(item: Agendamento) {
    if (bloquearSeAssinaturaInvalida()) return;

    abrirConfirmacao({
      title: "Excluir agendamento",
      message: "Deseja excluir este agendamento? Esta ação não poderá ser desfeita.",
      confirmLabel: "Excluir",
      tone: "danger",
      onConfirm: async () => {
        await sincronizarAgendamento({
          idAgendamento: item.id,
          idComandaNova: null,
          idServico: item.servico_id,
          idProfissional: item.profissional_id,
        });

        const { error } = await supabase.from("agendamentos").delete().eq("id", item.id);

        if (error) {
          console.error(error);
          throw new Error("Erro ao excluir agendamento.");
        }

        await loadAgenda();
      },
    });
  }

  async function handleCancelAppointment(item: Agendamento) {
    if (bloquearSeAssinaturaInvalida()) return;

    abrirConfirmacao({
      title: "Cancelar agendamento",
      message:
        "Deseja cancelar este agendamento? Os itens vinculados serão removidos da comanda. Se a comanda ficar sem itens, ela será cancelada automaticamente.",
      confirmLabel: "Cancelar agendamento",
      tone: "warning",
      onConfirm: async () => {
        await cancelarAgendamentoComComanda({
          supabase,
          idAgendamento: item.id,
        });

        setModalOpen(false);
        setEditingItem(null);
        await loadAgenda();
      },
    });
  }

  async function handleDeleteBlock(block: Bloqueio) {
    if (bloquearSeAssinaturaInvalida()) return;

    abrirMotivoExclusao({
      title: "Excluir bloqueio",
      message: "Informe o motivo da exclusão do bloqueio.",
      onConfirm: async (motivoExclusao: string) => {
        const user = await safeGetAuthUser();

        const { error: logError } = await supabase.from("agenda_bloqueios_logs").insert({
          bloqueio_id: block.id,
          id_salao: idSalao,
          profissional_id: block.profissional_id,
          data: block.data,
          hora_inicio: block.hora_inicio,
          hora_fim: block.hora_fim,
          motivo_original: block.motivo || null,
          motivo_exclusao: motivoExclusao || null,
          deleted_by: user?.id || null,
        });

        if (logError) {
          console.error(logError);
          throw new Error("Erro ao salvar log da exclusão do bloqueio.");
        }

        const { error } = await supabase.from("agenda_bloqueios").delete().eq("id", block.id);

        if (error) {
          console.error(error);
          throw new Error("Erro ao excluir bloqueio.");
        }

        await loadAgenda();
      },
    });
  }

  async function handleMoveBlock(
    block: Bloqueio,
    newStartTime: string,
    newEndTime: string,
    newDate?: string
  ) {
    if (bloquearSeAssinaturaInvalida()) return;
    if (!config) return;

    const targetDate = newDate || block.data;

    if (!ensureDiaFuncionamento({ config, dateString: targetDate })) {
      abrirAviso(
        "Dia indisponível",
        "Esse dia não está configurado como dia de funcionamento.",
        "warning"
      );
      return;
    }

    const validRange = validateAgendaTimeRange({
      config,
      profissionais,
      getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
        getProfessionalAutoBloqueios({
          profissionais,
          idSalao,
          config,
          profissionalId,
          date,
        }),
      profissionalId: block.profissional_id,
      date: targetDate,
      horaInicio: newStartTime,
      horaFim: newEndTime,
    });

    if (!validRange.ok) {
      abrirAviso("Horário inválido", validRange.message, "warning");
      return;
    }

    const conflitoAgendamento = agendamentos.some(
      (a) =>
        a.profissional_id === block.profissional_id &&
        a.data === targetDate &&
        overlaps(newStartTime, newEndTime, a.hora_inicio, a.hora_fim)
    );

    const conflitoBloqueio = bloqueios.some(
      (b) =>
        b.id !== block.id &&
        b.profissional_id === block.profissional_id &&
        b.data === targetDate &&
        overlaps(newStartTime, newEndTime, b.hora_inicio, b.hora_fim)
    );

    if (conflitoAgendamento || conflitoBloqueio) {
      abrirAviso(
        "Conflito de horário",
        "Não foi possível mover o bloqueio por conflito de horário.",
        "warning"
      );
      return;
    }

    const { error } = await supabase
      .from("agenda_bloqueios")
      .update({
        data: targetDate,
        hora_inicio: newStartTime,
        hora_fim: newEndTime,
      })
      .eq("id", block.id);

    if (error) {
      console.error(error);
      abrirAviso("Erro", "Erro ao mover bloqueio.", "danger");
      return;
    }

    await loadAgenda();
  }

  async function handleResizeBlock(block: Bloqueio, newEndTime: string) {
    if (bloquearSeAssinaturaInvalida()) return;
    if (!config) return;

    const horaInicio = normalizeTimeString(block.hora_inicio);
    const horaFim = normalizeTimeString(newEndTime);

    const validRange = validateAgendaTimeRange({
      config,
      profissionais,
      getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
        getProfessionalAutoBloqueios({
          profissionais,
          idSalao,
          config,
          profissionalId,
          date,
        }),
      profissionalId: block.profissional_id,
      date: block.data,
      horaInicio,
      horaFim,
    });

    if (!validRange.ok) {
      abrirAviso("Horário inválido", validRange.message, "warning");
      return;
    }

    const conflitoAgendamento = agendamentos.some(
      (a) =>
        a.profissional_id === block.profissional_id &&
        a.data === block.data &&
        overlaps(horaInicio, horaFim, a.hora_inicio, a.hora_fim)
    );

    const conflitoBloqueio = bloqueios.some(
      (b) =>
        b.id !== block.id &&
        b.profissional_id === block.profissional_id &&
        b.data === block.data &&
        overlaps(horaInicio, horaFim, b.hora_inicio, b.hora_fim)
    );

    if (conflitoAgendamento || conflitoBloqueio) {
      abrirAviso(
        "Conflito de horário",
        "Não foi possível redimensionar o bloqueio por conflito.",
        "warning"
      );
      return;
    }

    const { error } = await supabase
      .from("agenda_bloqueios")
      .update({
        hora_fim: horaFim,
      })
      .eq("id", block.id);

    if (error) {
      console.error(error);
      abrirAviso("Erro", "Erro ao redimensionar bloqueio.", "danger");
      return;
    }

    await loadAgenda();
  }

  function handleGoToCashier(item: Agendamento) {
    if (assinaturaBloqueada) {
      abrirAviso(
        "Acesso bloqueado",
        "Sua assinatura está vencida. Regularize para acessar o caixa.",
        "danger",
        "/assinatura"
      );
      return;
    }

    router.push(`/caixa?agendamento_id=${item.id}`);
  }

  const selectedProfissional = useMemo(
    () => profissionais.find((p) => p.id === selectedProfissionalId),
    [profissionais, selectedProfissionalId]
  );

  const totalAtendimentos = useMemo(() => agendamentos.length, [agendamentos]);
  const aguardandoPagamento = useMemo(
    () => agendamentos.filter((item) => item.status === "aguardando_pagamento").length,
    [agendamentos]
  );
  const totalBloqueios = useMemo(() => bloqueios.length, [bloqueios]);
  const valorPotencial = useMemo(
    () =>
      agendamentos.reduce(
        (total, item) => total + Number(item.servico?.preco || 0),
        0
      ),
    [agendamentos]
  );

  if (loading || !acessoCarregado) {
    return <div className="p-6">Carregando agenda...</div>;
  }

  if (permissoes && !permissoes.agenda_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar a agenda.
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {erroTela || "Não foi possível carregar as configurações do salão."}
        </div>
      </div>
    );
  }

  const configInfo = config as ConfigSalao & { dias_funcionamento?: string[] | null };
  const diasFuncionamento = sanitizeDiasFuncionamento(configInfo.dias_funcionamento ?? []);

  return (
    <>
      <div
        className={
          agendaExpanded
            ? "fixed inset-0 z-40 flex min-h-0 flex-col gap-2 bg-white p-2 md:p-3"
            : "flex h-[calc(100vh-9.5rem)] min-h-0 flex-col gap-2 overflow-hidden bg-white"
        }
      >
        <ProfissionaisBar
          profissionais={profissionais}
          selectedProfissionalId={selectedProfissionalId}
          onSelect={setSelectedProfissionalId}
        />

        <AgendaToolbar
          currentDate={currentDate}
          viewMode={viewMode}
          selectedProfessionalName={selectedProfissional?.nome || ""}
          selectedProfessionalRole={
            selectedProfissional?.cargo || selectedProfissional?.categoria || ""
          }
          appointmentsCount={totalAtendimentos}
          waitingPaymentCount={aguardandoPagamento}
          blockedCount={totalBloqueios}
          potentialValue={valorPotencial}
          onPrev={() =>
            setCurrentDate((prev) =>
              viewMode === "day" ? subDays(prev, 1) : subDays(prev, 7)
            )
          }
          onNext={() =>
            setCurrentDate((prev) =>
              viewMode === "day" ? addDays(prev, 1) : addDays(prev, 7)
            )
          }
          onToday={() => setCurrentDate(new Date())}
          onChangeView={setViewMode}
          isExpanded={agendaExpanded}
          onToggleExpanded={() => setAgendaExpanded((prev) => !prev)}
          onNewAppointment={() =>
            assinaturaBloqueada
              ? abrirAviso(
                  "Assinatura bloqueada",
                  "Regularize o pagamento para voltar a criar agendamentos.",
                  "danger",
                  "/assinatura"
                )
              : openCreateModal(
                  formatFullDate(currentDate),
                  normalizeTimeString(config.hora_abertura)
                )
          }
          onNewBlock={() =>
            assinaturaBloqueada
              ? abrirAviso(
                  "Assinatura bloqueada",
                  "Regularize o pagamento para voltar a criar bloqueios.",
                  "danger",
                  "/assinatura"
                )
              : openBlockModal(
                  formatFullDate(currentDate),
                  normalizeTimeString(config.hora_abertura)
                )
          }
        />

        {assinaturaBloqueada ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Assinatura bloqueada por atraso. Regularize o pagamento para voltar a usar a agenda.
          </div>
        ) : null}

        {erroTela ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erroTela}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden rounded-[22px] border border-zinc-200 bg-white select-none">
          <AgendaGrid
            viewMode={viewMode}
            currentDate={currentDate}
            startTime={normalizeTimeString(config.hora_abertura)}
            endTime={normalizeTimeString(config.hora_fechamento)}
            intervalMinutes={config.intervalo_minutos}
            diasFuncionamento={diasFuncionamento}
            agendamentos={agendamentos}
            bloqueios={bloqueios}
            selectedProfessional={selectedProfissional}
            onClickSlot={openCreateModal}
            onResizeEvent={handleResizeEvent}
            onMoveEvent={handleMoveEvent}
            onEditEvent={openEditModal}
            onDeleteEvent={handleDeleteEvent}
            onGoToCashier={handleGoToCashier}
            onEditBlock={handleEditBlock}
            onDeleteBlock={handleDeleteBlock}
            onMoveBlock={handleMoveBlock}
            onResizeBlock={handleResizeBlock}
            isExpanded={agendaExpanded}
          />
        </div>

        <AgendaModal
          open={modalOpen}
          mode={modalMode}
          editingItem={editingItem}
          editingBlock={editingBlock}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
            setEditingBlock(null);
          }}
          onSave={handleSave}
          onCancelAppointment={handleCancelAppointment}
          profissionais={profissionais}
          clientes={clientes}
          servicos={servicos}
          selectedProfissionalId={selectedProfissionalId}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onBuscarComandasAbertas={buscarComandasAbertasDoCliente}
          onCriarComanda={criarNovaComanda}
        />
      </div>
      <AgendaNoticeDialog modal={avisoModal} onClose={fecharAviso} />
      <AgendaConfirmDialog
        modal={confirmModal}
        loading={confirmLoading}
        onClose={fecharConfirmacao}
        onConfirm={executarConfirmacao}
      />
      <AgendaReasonDialog
        modal={motivoModal}
        loading={motivoLoading}
        onClose={fecharMotivo}
        onChangeValue={setMotivoValor}
        onConfirm={executarMotivo}
      />
    </>
  );
}
