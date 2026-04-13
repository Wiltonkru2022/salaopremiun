"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AgendaToolbar from "@/components/agenda/AgendaToolbar";
import AgendaGrid from "@/components/agenda/AgendaGrid";
import AgendaModal from "@/components/agenda/AgendaModal";
import ProfissionaisBar from "@/components/agenda/ProfissionaisBar";
import { cancelarAgendamentoComComanda } from "@/lib/agenda/cancelarAgendamentoComComanda";
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

type ComandaResumo = {
  id: string;
  numero: number;
  status: string;
  id_cliente?: string | null;
};

type AvisoModalState = {
  open: boolean;
  title: string;
  message: string;
  tone?: "default" | "danger" | "warning";
  redirectTo?: string | null;
};

type ConfirmModalState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "default" | "danger" | "warning";
  onConfirm?: (() => Promise<void>) | null;
};

type MotivoModalState = {
  open: boolean;
  title: string;
  message: string;
  value: string;
  onConfirm?: ((value: string) => Promise<void>) | null;
};

export default function AgendaPage() {
  const supabase = createClient();
  const router = useRouter();

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

  const [avisoModal, setAvisoModal] = useState<AvisoModalState>({
    open: false,
    title: "",
    message: "",
    tone: "default",
    redirectTo: null,
  });

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirmar",
    tone: "default",
    onConfirm: null,
  });

  const [motivoModal, setMotivoModal] = useState<MotivoModalState>({
    open: false,
    title: "",
    message: "",
    value: "",
    onConfirm: null,
  });

  const [confirmLoading, setConfirmLoading] = useState(false);
  const [motivoLoading, setMotivoLoading] = useState(false);

  function abrirAviso(
    title: string,
    message: string,
    tone: "default" | "danger" | "warning" = "default",
    redirectTo?: string | null
  ) {
    setAvisoModal({
      open: true,
      title,
      message,
      tone,
      redirectTo: redirectTo || null,
    });
  }

  function fecharAviso() {
    const redirectTo = avisoModal.redirectTo;

    setAvisoModal({
      open: false,
      title: "",
      message: "",
      tone: "default",
      redirectTo: null,
    });

    if (redirectTo) {
      router.push(redirectTo);
    }
  }

  function abrirConfirmacao(params: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "default" | "danger" | "warning";
    onConfirm: () => Promise<void>;
  }) {
    setConfirmModal({
      open: true,
      title: params.title,
      message: params.message,
      confirmLabel: params.confirmLabel || "Confirmar",
      tone: params.tone || "default",
      onConfirm: params.onConfirm,
    });
  }

  async function executarConfirmacao() {
    if (!confirmModal.onConfirm) return;

    try {
      setConfirmLoading(true);
      await confirmModal.onConfirm();

      setConfirmModal({
        open: false,
        title: "",
        message: "",
        confirmLabel: "Confirmar",
        tone: "default",
        onConfirm: null,
      });
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Não foi possível concluir",
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        "danger"
      );
    } finally {
      setConfirmLoading(false);
    }
  }

  function abrirMotivoExclusao(params: {
    title: string;
    message: string;
    onConfirm: (value: string) => Promise<void>;
  }) {
    setMotivoModal({
      open: true,
      title: params.title,
      message: params.message,
      value: "",
      onConfirm: params.onConfirm,
    });
  }

  async function executarMotivo() {
    if (!motivoModal.onConfirm) return;

    try {
      setMotivoLoading(true);
      await motivoModal.onConfirm(motivoModal.value);

      setMotivoModal({
        open: false,
        title: "",
        message: "",
        value: "",
        onConfirm: null,
      });
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Não foi possível concluir",
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        "danger"
      );
    } finally {
      setMotivoLoading(false);
    }
  }

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

    const data = await loadAgendaData({
      supabase,
      idSalao,
      selectedProfissionalId,
      viewMode,
      currentDate,
      clientes,
      servicos,
    });

    setAgendamentos(data.agendamentos);
    setBloqueios(data.bloqueios);
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

  async function buscarComandasAbertasDoCliente(clienteId: string): Promise<ComandaResumo[]> {
    if (!idSalao || !clienteId) return [];

    const { data, error } = await supabase
      .from("comandas")
      .select("id, numero, status, id_cliente")
      .eq("id_salao", idSalao)
      .eq("id_cliente", clienteId)
      .in("status", ["aberta", "em_atendimento", "aguardando_pagamento"])
      .order("aberta_em", { ascending: false });

    if (error) {
      console.error("Erro ao buscar comandas abertas:", error);
      throw new Error("Erro ao buscar comandas abertas.");
    }

    return (data as ComandaResumo[]) || [];
  }

  async function criarNovaComanda(clienteId: string): Promise<ComandaResumo> {
    if (bloquearSeAssinaturaInvalida()) {
      throw new Error("Assinatura bloqueada.");
    }

    if (!idSalao) {
      throw new Error("Salão não identificado.");
    }

    const { data: ultimaRows, error: ultimaError } = await supabase
      .from("comandas")
      .select("numero")
      .eq("id_salao", idSalao)
      .order("numero", { ascending: false })
      .limit(1);

    if (ultimaError) {
      console.error("Erro ao buscar último número da comanda:", ultimaError);
      throw new Error("Erro ao gerar número da comanda.");
    }

    const ultimoNumero = ultimaRows?.[0]?.numero || 0;

    const { data, error } = await supabase
      .from("comandas")
      .insert({
        id_salao: idSalao,
        numero: ultimoNumero + 1,
        id_cliente: clienteId,
        status: "aberta",
        origem: "agenda",
      })
      .select("id, numero, status, id_cliente")
      .limit(1);

    if (error) {
      console.error("Erro ao criar comanda:", error);
      throw new Error("Erro ao criar nova comanda.");
    }

    const nova = data?.[0] as ComandaResumo | undefined;

    if (!nova) {
      throw new Error("Não foi possível criar a comanda.");
    }

    return nova;
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
    const novoFim = normalizeTimeString(
      `${String(Math.floor((Number(startTime.split(":")[0]) * 60 + Number(startTime.split(":")[1]) + newDuration) / 60)).padStart(2, "0")}:${String((Number(startTime.split(":")[0]) * 60 + Number(startTime.split(":")[1]) + newDuration) % 60).padStart(2, "0")}`
    );

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

    const { error } = await supabase
      .from("agendamentos")
      .update({
        duracao_minutos: newDuration,
        hora_fim: novoFim,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      console.error(error);
      abrirAviso("Erro", "Erro ao atualizar duração.", "danger");
      return;
    }

    if (item.id_comanda) {
      await sincronizarAgendamento({
        idAgendamento: item.id,
        idComandaNova: item.id_comanda,
        idServico: item.servico_id,
        idProfissional: item.profissional_id,
      });
    }

    await loadAgenda();
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
    const novoFim = normalizeTimeString(
      `${String(Math.floor((Number(startTime.split(":")[0]) * 60 + Number(startTime.split(":")[1]) + item.duracao_minutos) / 60)).padStart(2, "0")}:${String((Number(startTime.split(":")[0]) * 60 + Number(startTime.split(":")[1]) + item.duracao_minutos) % 60).padStart(2, "0")}`
    );

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

    const { error } = await supabase
      .from("agendamentos")
      .update({
        data: move.newDate,
        hora_inicio: startTime,
        hora_fim: novoFim,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      console.error(error);
      abrirAviso("Erro", "Erro ao mover agendamento.", "danger");
      return;
    }

    if (item.id_comanda) {
      await sincronizarAgendamento({
        idAgendamento: item.id,
        idComandaNova: item.id_comanda,
        idServico: item.servico_id,
        idProfissional: item.profissional_id,
      });
    }

    await loadAgenda();
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

  const toneClasses =
    avisoModal.tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : avisoModal.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-zinc-200 bg-zinc-50 text-zinc-700";

  const confirmToneButton =
    confirmModal.tone === "danger"
      ? "bg-red-600 hover:bg-red-500"
      : confirmModal.tone === "warning"
      ? "bg-amber-600 hover:bg-amber-500"
      : "bg-zinc-950 hover:bg-zinc-800";

  return (
    <>
      <div
        className={
          agendaExpanded
            ? "fixed inset-0 z-40 flex min-h-0 flex-col gap-2 bg-zinc-100 p-2 md:p-3"
            : "flex h-[calc(100vh-8px)] min-h-0 flex-col gap-2 overflow-hidden bg-zinc-100 p-2 md:p-3"
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

        <div className="min-h-0 flex-1 overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-sm select-none">
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

      {avisoModal.open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className={`rounded-2xl border px-4 py-4 ${toneClasses}`}>
              <div className="text-lg font-bold">{avisoModal.title}</div>
              <div className="mt-2 text-sm leading-6">{avisoModal.message}</div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={fecharAviso}
                className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal.open ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="text-lg font-bold text-zinc-950">{confirmModal.title}</div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">{confirmModal.message}</div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() =>
                  setConfirmModal({
                    open: false,
                    title: "",
                    message: "",
                    confirmLabel: "Confirmar",
                    tone: "default",
                    onConfirm: null,
                  })
                }
                className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Fechar
              </button>

              <button
                type="button"
                disabled={confirmLoading}
                onClick={executarConfirmacao}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${confirmToneButton}`}
              >
                {confirmLoading ? "Processando..." : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {motivoModal.open ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="text-lg font-bold text-zinc-950">{motivoModal.title}</div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">{motivoModal.message}</div>

            <textarea
              value={motivoModal.value}
              onChange={(e) =>
                setMotivoModal((prev) => ({
                  ...prev,
                  value: e.target.value,
                }))
              }
              placeholder="Digite o motivo..."
              className="mt-4 min-h-[120px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 outline-none"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={motivoLoading}
                onClick={() =>
                  setMotivoModal({
                    open: false,
                    title: "",
                    message: "",
                    value: "",
                    onConfirm: null,
                  })
                }
                className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Fechar
              </button>

              <button
                type="button"
                disabled={motivoLoading}
                onClick={executarMotivo}
                className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {motivoLoading ? "Salvando..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}