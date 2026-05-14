"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePathname, useRouter } from "next/navigation";
import AgendaToolbar from "@/components/agenda/AgendaToolbar";
import AgendaGrid from "@/components/agenda/AgendaGrid";
import AgendaSidebar from "@/components/agenda/AgendaSidebar";
import type {
  AgendaSidebarPanel,
  AgendaSidebarView,
  AgendaWaitlistItem,
} from "@/components/agenda/AgendaSidebar";
import ProfissionaisBar from "@/components/agenda/ProfissionaisBar";
import type {
  AgendaPageNoticeState,
  AgendaPageConfirmState,
  AgendaPageReasonState,
  ComandaResumo,
} from "@/components/agenda/page-types";
import { useAgendaActions } from "@/components/agenda/useAgendaActions";
import { useAgendaData } from "@/components/agenda/useAgendaData";
import { useAgendaMutations } from "@/components/agenda/useAgendaMutations";
import { useAgendaPageState } from "@/components/agenda/useAgendaPageState";
import { useAgendaFeedback } from "@/components/agenda/useAgendaFeedback";
import AppLoading from "@/components/ui/AppLoading";
import {
  buscarComandasAbertasDoClienteAgenda,
  criarNovaComandaAgenda,
} from "@/lib/agenda/comandasAgenda";
import { captureClientEvent } from "@/lib/monitoring/client";
import { sanitizeDiasFuncionamento } from "@/lib/utils/agenda";
import type { Agendamento, ConfigSalao } from "@/types/agenda";
import { normalizeTimeString } from "@/lib/utils/agenda";
import { getErrorMessage } from "@/lib/get-error-message";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { openPainelWorkspaceWindow } from "@/lib/painel/workspace-windows";
import {
  Ban,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Coffee,
  PencilLine,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";

const AgendaModal = dynamic(() => import("@/components/agenda/AgendaModal"));
const AgendaContextMenu = dynamic(
  () => import("@/components/agenda/AgendaContextMenu")
);
const AgendaClientProfileModal = dynamic(
  () => import("@/components/agenda/AgendaClientProfileModal")
);
const AgendaCreditModal = dynamic(
  () => import("@/components/agenda/AgendaCreditModal")
);

type ClienteHistoricoItem = {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  servicoNome: string;
  observacoes: string | null;
};

function addMinutesToSlotTime(time: string, minutes: number) {
  const [hour, minute] = normalizeTimeString(time).split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return normalizeTimeString(
    `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
      total % 60
    ).padStart(2, "0")}`
  );
}

export default function AgendaPage() {
  const router = useRouter();
  const pathname = usePathname();
  const loadAgendaSeqRef = useRef(0);
  const [contextMenu, setContextMenu] = useState<
    | { open: false }
    | {
        open: true;
        type: "slot";
        x: number;
        y: number;
      }
    | {
        open: true;
        type: "appointment";
        x: number;
        y: number;
        item: Agendamento;
      }
  >({ open: false });
  const [clienteProfileOpen, setClienteProfileOpen] = useState(false);
  const [clienteProfileLoading, setClienteProfileLoading] = useState(false);
  const [clienteProfileNome, setClienteProfileNome] = useState("");
  const [clienteProfileWhatsapp, setClienteProfileWhatsapp] = useState<string | null>("");
  const [clienteProfileCredito, setClienteProfileCredito] = useState(0);
  const [clienteProfileHistorico, setClienteProfileHistorico] = useState<
    ClienteHistoricoItem[]
  >([]);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditClienteId, setCreditClienteId] = useState("");
  const [creditValue, setCreditValue] = useState("");
  const [creditObservation, setCreditObservation] = useState("");
  const [creditLoading, setCreditLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<AgendaSidebarView>("overview");
  const [potentialValueVisible, setPotentialValueVisible] = useState(true);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const [clientCreateName, setClientCreateName] = useState("");
  const [clientCreateWhatsapp, setClientCreateWhatsapp] = useState("");
  const [clientCreateSaving, setClientCreateSaving] = useState(false);
  const [googleCalendarSyncing, setGoogleCalendarSyncing] = useState(false);

  const {
    supabase,
    loading,
    setLoading,
    erroTela,
    setErroTela,
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    idSalao,
    setIdSalao,
    agendaExpanded,
    densityMode,
    setDensityMode,
    permissoes,
    setPermissoes,
    acessoCarregado,
    setAcessoCarregado,
    config,
    setConfig,
    profissionais,
    setProfissionais,
    clientes,
    setClientes,
    servicos,
    setServicos,
    agendamentos,
    setAgendamentos,
    bloqueios,
    setBloqueios,
    selectedProfissionalId,
    setSelectedProfissionalId,
    modalOpen,
    setModalOpen,
    modalMode,
    setModalMode,
    editingItem,
    setEditingItem,
    editingBlock,
    setEditingBlock,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    selectedBlockEndTime,
    setSelectedBlockEndTime,
    selectedBlockReason,
    setSelectedBlockReason,
    setSlotActionOpen,
    assinaturaBloqueada,
    setAssinaturaBloqueada,
    selectedProfissional,
    totalAtendimentos,
    aguardandoPagamento,
    totalBloqueios,
    valorPotencial,
  } = useAgendaPageState();

  function resetCreditForm() {
    setCreditClienteId("");
    setCreditValue("");
    setCreditObservation("");
  }

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
    onRedirect: (path) => {
      if (/^https?:\/\//i.test(path)) {
        window.location.assign(path);
        return;
      }
      router.push(path);
    },
  });

  const {
    bloquearSeAssinaturaInvalida,
    openCreateModal,
    openBlockModal,
    openEditModal,
    handleEditBlock,
    closeModal,
  } = useAgendaActions({
    assinaturaBloqueada,
    config,
    abrirAviso,
    setSelectedDate,
    setSelectedTime,
    setEditingItem,
    setEditingBlock,
    setModalMode,
    setModalOpen,
    setSelectedBlockEndTime,
    setSelectedBlockReason,
    setSlotActionOpen,
  });

  const { safeGetAuthUser, sincronizarAgendamento, loadAgenda, init } =
    useAgendaData({
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
    });

  const {
    handleSave,
    handleResizeEvent,
    handleMoveEvent,
    handleDeleteEvent,
    handleQuickStatusChange,
    handleCancelAppointment,
    handleDeleteBlock,
    handleMoveBlock,
    handleResizeBlock,
  } = useAgendaMutations({
    supabase,
    idSalao,
    config,
    modalMode,
    editingItem,
    editingBlock,
    profissionais,
    servicos,
    agendamentos,
    bloqueios,
    loadAgendaSeqRef,
    loadAgenda,
    safeGetAuthUser,
    sincronizarAgendamento,
    bloquearSeAssinaturaInvalida,
    abrirAviso,
    abrirConfirmacao,
    abrirMotivoExclusao,
    setModalOpen,
    setEditingItem,
    setEditingBlock,
    setAgendamentos,
  });

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("salaopremium:agenda:density");
    if (saved === "standard" || saved === "reception") {
      setDensityMode(saved);
    }
  }, [setDensityMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("salaopremium:agenda:density", densityMode);
  }, [densityMode]);

  useEffect(() => {
    if (idSalao && selectedProfissionalId) {
      void loadAgenda();
    }
  }, [idSalao, loadAgenda, selectedProfissionalId]);

  useEffect(() => {
    if (!idSalao || !selectedProfissionalId || modalOpen || loading) {
      return;
    }

    const refreshOnReturn = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadAgenda();
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadAgenda();
    }, 30000);

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [idSalao, selectedProfissionalId, modalOpen, loading, loadAgenda]);

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

  async function handleReceiveFromClient(item: Agendamento) {
    if (assinaturaBloqueada) {
      abrirAviso(
        "Acesso bloqueado",
        "Sua assinatura está vencida. Regularize para acessar o caixa.",
        "danger",
        getAssinaturaUrl("/assinatura")
      );
      return;
    }

    if (item.id_comanda) {
      void captureClientEvent({
        module: "agenda",
        eventType: "ui_event",
        action: "receber_cliente_por_agendamento",
        screen: "agenda_grid",
        entity: "agendamento",
        entityId: item.id,
        message: "Usuário abriu o caixa a partir de um agendamento já vinculado.",
        details: {
          idSalao,
          idComanda: item.id_comanda,
          modo: "comanda_existente",
        },
        success: true,
      });

      openCashierWindow(`/caixa?comanda_id=${item.id_comanda}`);
      return;
    }

    if (!item.cliente_id) {
      abrirAviso(
        "Cliente obrigatoria",
        "Esse agendamento precisa ter uma cliente vinculada antes de ir para o caixa.",
        "warning"
      );
      return;
    }

    if (!item.servico_id || !item.profissional_id) {
      abrirAviso(
        "Agendamento incompleto",
        "Não encontrei o serviço ou a profissional desse agendamento para abrir no caixa.",
        "warning"
      );
      return;
    }

    try {
      const comandas = await buscarComandasAbertasDoCliente(item.cliente_id);
      const comanda = comandas[0] || (await criarNovaComanda(item.cliente_id));

      await sincronizarAgendamento({
        idAgendamento: item.id,
        idComandaNova: comanda.id,
        idServico: item.servico_id,
        idProfissional: item.profissional_id,
      });

      void captureClientEvent({
        module: "agenda",
        eventType: "ui_event",
        action: "receber_cliente_por_agendamento",
        screen: "agenda_grid",
        entity: "agendamento",
        entityId: item.id,
        message: "Usuário enviou o agendamento para o caixa.",
        details: {
          idSalao,
          idComanda: comanda.id,
          modo: comandas[0] ? "comanda_reaproveitada" : "comanda_criada",
        },
        success: true,
      });

      openCashierWindow(`/caixa?comanda_id=${comanda.id}`);
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Erro ao receber cliente",
        getErrorMessage(
          error,
          "Não foi possível abrir esse agendamento no caixa agora."
        ),
        "danger"
      );
    }
  }

  function handleGoToCashier(item: Agendamento) {
    void handleReceiveFromClient(item);
  }

  async function handleOpenCreditFlow() {
    if (!creditClienteId) {
      abrirAviso(
        "Cliente obrigatoria",
        "Escolha a cliente antes de registrar o crédito.",
        "warning"
      );
      return;
    }

    if (!idSalao) {
      abrirAviso("Salão indisponível", "Não foi possível identificar o salão.", "danger");
      return;
    }

    try {
      setCreditLoading(true);
      const response = await fetch("/api/clientes/credito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao,
          clienteId: creditClienteId,
          valor: creditValue,
          observacao: creditObservation,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        saldoAtual?: number;
      };

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível registrar o crédito.");
      }

      const saldoAtual = Number(data.saldoAtual || 0);

      setCreditModalOpen(false);
      resetCreditForm();
      await loadAgenda();
      abrirAviso(
        "Crédito registrado",
        `Saldo atualizado da cliente: ${saldoAtual.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}.`,
        "default"
      );
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Erro ao registrar crédito",
        getErrorMessage(error, "Não foi possível registrar o crédito da cliente."),
        "danger"
      );
    } finally {
      setCreditLoading(false);
    }
  }

  async function openClientProfile(item: Agendamento) {
    setClienteProfileOpen(true);
    setClienteProfileLoading(true);
    setClienteProfileNome(item.cliente?.nome || "Cliente");
    setClienteProfileWhatsapp(item.cliente?.whatsapp || null);
    setClienteProfileCredito(Number(item.cliente?.cashback || 0));

    try {
      const [{ data: clienteData, error: clienteError }, { data, error }] =
        await Promise.all([
          supabase
            .from("clientes")
            .select("cashback")
            .eq("id_salao", idSalao)
            .eq("id", item.cliente_id)
            .maybeSingle(),
          supabase
            .from("agendamentos")
            .select(
              "id, data, hora_inicio, hora_fim, status, observacoes, servicos(nome)"
            )
            .eq("id_salao", idSalao)
            .eq("cliente_id", item.cliente_id)
            .order("data", { ascending: false })
            .order("hora_inicio", { ascending: false })
            .limit(12),
        ]);

      if (clienteError) throw clienteError;
      setClienteProfileCredito(Number(clienteData?.cashback || 0));

      if (error) throw error;

      const historico = ((data || []) as Array<{
        id: string;
        data: string;
        hora_inicio: string;
        hora_fim: string;
        status: string;
        observacoes: string | null;
        servicos?: { nome?: string | null } | Array<{ nome?: string | null }> | null;
      }>).map((row) => ({
        id: row.id,
        data: row.data,
        horaInicio: normalizeTimeString(row.hora_inicio),
        horaFim: normalizeTimeString(row.hora_fim),
        status: row.status,
        servicoNome: Array.isArray(row.servicos)
          ? row.servicos[0]?.nome || "Servico"
          : row.servicos?.nome || "Servico",
        observacoes: row.observacoes,
      }));

      setClienteProfileHistorico(historico);
    } catch (error) {
      console.error(error);
      setClienteProfileHistorico([
        {
          id: item.id,
          data: item.data,
          horaInicio: normalizeTimeString(item.hora_inicio),
          horaFim: normalizeTimeString(item.hora_fim),
          status: item.status,
          servicoNome: item.servico?.nome || "Servico",
          observacoes: item.observacoes,
        },
      ]);
      abrirAviso(
        "Histórico parcial",
        "Não foi possível carregar o histórico completo agora. Vou abrir pelo menos os dados do agendamento atual.",
        "warning"
      );
    } finally {
      setClienteProfileLoading(false);
    }
  }

  async function openClientProfileFromSearch(clientId: string) {
    const cliente = clientes.find((item) => item.id === clientId);
    setSidebarView("clientSearch");
    setClienteProfileOpen(true);
    setClienteProfileLoading(true);
    setClienteProfileNome(cliente?.nome || "Cliente");
    setClienteProfileWhatsapp(cliente?.whatsapp || null);
    setClienteProfileCredito(Number(cliente?.cashback || 0));
    setClienteProfileHistorico([]);

    try {
      const [{ data: clienteData, error: clienteError }, { data, error }] =
        await Promise.all([
          supabase
            .from("clientes")
            .select("nome, whatsapp, cashback")
            .eq("id_salao", idSalao)
            .eq("id", clientId)
            .maybeSingle(),
          supabase
            .from("agendamentos")
            .select(
              "id, data, hora_inicio, hora_fim, status, observacoes, servicos(nome)"
            )
            .eq("id_salao", idSalao)
            .eq("cliente_id", clientId)
            .order("data", { ascending: false })
            .order("hora_inicio", { ascending: false })
            .limit(6),
        ]);

      if (clienteError) throw clienteError;
      if (error) throw error;

      setClienteProfileNome(String(clienteData?.nome || cliente?.nome || "Cliente"));
      setClienteProfileWhatsapp(
        String(clienteData?.whatsapp || cliente?.whatsapp || "") || null
      );
      setClienteProfileCredito(Number(clienteData?.cashback || cliente?.cashback || 0));

      const historico = ((data || []) as Array<{
        id: string;
        data: string;
        hora_inicio: string;
        hora_fim: string;
        status: string;
        observacoes: string | null;
        servicos?: { nome?: string | null } | Array<{ nome?: string | null }> | null;
      }>).map((row) => ({
        id: row.id,
        data: row.data,
        horaInicio: normalizeTimeString(row.hora_inicio),
        horaFim: normalizeTimeString(row.hora_fim),
        status: row.status,
        servicoNome: Array.isArray(row.servicos)
          ? row.servicos[0]?.nome || "Servico"
          : row.servicos?.nome || "Servico",
        observacoes: row.observacoes,
      }));

      setClienteProfileHistorico(historico);
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Perfil parcial",
        "Nao foi possivel carregar todo o historico agora. Mantive os dados principais da cliente no painel lateral.",
        "warning"
      );
    } finally {
      setClienteProfileLoading(false);
    }
  }

  function openSlotMenu(
    date: string,
    time: string,
    position: { x: number; y: number }
  ) {
    if (bloquearSeAssinaturaInvalida()) return;

    setSelectedDate(date);
    setSelectedTime(time);
    setSlotActionOpen(false);
    setContextMenu({
      open: true,
      type: "slot",
      x: position.x,
      y: position.y,
    });
  }

  function openAppointmentMenu(
    item: Agendamento,
    position: { x: number; y: number }
  ) {
    if (bloquearSeAssinaturaInvalida()) return;

    setSlotActionOpen(false);
    setContextMenu({
      open: true,
      type: "appointment",
      item,
      x: position.x,
      y: position.y,
    });
  }

  const hasSidebarActionPanel =
    modalOpen ||
    clienteProfileOpen ||
    creditModalOpen ||
    avisoModal.open ||
    confirmModal.open ||
    motivoModal.open;

  useEffect(() => {
    if (hasSidebarActionPanel) {
      setSidebarOpen(true);
    }
  }, [hasSidebarActionPanel]);

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando agenda"
        message="Aguarde enquanto organizamos horários, profissionais e atendimentos do periodo."
        fullHeight={false}
      />
    );
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

  const configInfo = config as ConfigSalao & {
    dias_funcionamento?: string[] | null;
  };
  const diasFuncionamento = sanitizeDiasFuncionamento(
    configInfo.dias_funcionamento ?? []
  );
  const statusCounts = agendamentos.reduce(
    (acc, item) => {
      if (item.status === "confirmado") acc.confirmado += 1;
      else if (item.status === "pendente") acc.pendente += 1;
      else if (item.status === "atendido") acc.atendido += 1;
      else if (item.status === "aguardando_pagamento") acc.aguardandoPagamento += 1;
      else if (item.status === "cancelado") acc.cancelado += 1;
      return acc;
    },
    {
      confirmado: 0,
      pendente: 0,
      atendido: 0,
      aguardandoPagamento: 0,
      cancelado: 0,
    }
  );
  const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const totalValueCaption =
    viewMode === "day" ? "Valor total do dia" : "Valor total da semana";
  const defaultSlotDate = format(
    viewMode === "day" ? currentDate : new Date(),
    "yyyy-MM-dd"
  );
  const defaultSlotTime = normalizeTimeString(config.hora_abertura);
  const isStandaloneAgendaRoute = pathname === "/agenda";
  const showFocusMode = false;
  const normalizedClientSearch = clientSearchQuery.trim().toLowerCase();
  const clientSearchResults = clientes
    .filter((cliente) => {
      if (!normalizedClientSearch) return false;

      return (
        cliente.nome.toLowerCase().includes(normalizedClientSearch) ||
        String(cliente.whatsapp || "").toLowerCase().includes(normalizedClientSearch)
      );
    })
    .slice(0, 12);
  function openCashierWindow(href: string) {
    if (typeof window === "undefined") {
      router.push(href);
      return;
    }

    openPainelWorkspaceWindow(href);
  }

  const waitlistItems: AgendaWaitlistItem[] = agendamentos
    .filter((item) => item.status === "pendente")
    .sort((a, b) => {
      const dateCompare = String(a.data).localeCompare(String(b.data));
      if (dateCompare !== 0) return dateCompare;
      return normalizeTimeString(a.hora_inicio).localeCompare(
        normalizeTimeString(b.hora_inicio)
      );
    })
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      clientName: item.cliente?.nome || "Cliente sem nome",
      serviceName: item.servico?.nome || "Servico",
      dateLabel: format(new Date(`${item.data}T12:00:00`), "dd/MM"),
      timeLabel: `${normalizeTimeString(item.hora_inicio)} - ${normalizeTimeString(
        item.hora_fim
      )}`,
      statusLabel: "Pendente",
    }));

  async function handleCreateClientFromSidebar() {
    if (!idSalao) {
      abrirAviso("Salão indisponível", "Não foi possível identificar o salão atual.");
      return;
    }

    if (!clientCreateName.trim()) {
      abrirAviso("Nome obrigatorio", "Informe pelo menos o nome da cliente.");
      return;
    }

    try {
      setClientCreateSaving(true);

      const response = await fetch("/api/clientes/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao,
          acao: "salvar",
          cliente: {
            nome: clientCreateName.trim(),
            whatsapp: clientCreateWhatsapp.trim() || null,
            ativo: true,
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        idCliente?: string;
        error?: string;
      };

      if (!response.ok || !data.idCliente) {
        throw new Error(data.error || "Não foi possível cadastrar a cliente.");
      }

      const novaCliente = {
        id: data.idCliente,
        nome: clientCreateName.trim(),
        whatsapp: clientCreateWhatsapp.trim() || null,
      };

      setClientes((prev) => {
        const next = prev.filter((item) => item.id !== novaCliente.id);
        return [...next, novaCliente].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      });
      setClientSearchQuery(novaCliente.nome);
      setClientCreateOpen(false);
      setClientCreateName("");
      setClientCreateWhatsapp("");
      abrirAviso("Cliente criado", "Cadastro rápido concluido com sucesso.");
    } catch (error) {
      abrirAviso("Erro ao cadastrar cliente", getErrorMessage(error), "danger");
    } finally {
      setClientCreateSaving(false);
    }
  }

  function handleStartCreateClient() {
    setClientCreateOpen(true);
    setClientCreateName(clientSearchQuery.trim());
  }

  function handleCancelCreateClient() {
    setClientCreateOpen(false);
    setClientCreateName("");
    setClientCreateWhatsapp("");
  }

  function closeSidebarPanels() {
    if (modalOpen) {
      closeModal();
    }
    if (clienteProfileOpen) {
      setClienteProfileOpen(false);
    }
    if (creditModalOpen) {
      setCreditModalOpen(false);
      resetCreditForm();
    }
    if (avisoModal.open) {
      fecharAviso();
    }
    if (confirmModal.open) {
      fecharConfirmacao();
    }
    if (motivoModal.open) {
      fecharMotivo();
    }
    setSidebarView("overview");
  }

  async function handleGoogleCalendarSync() {
    if (!idSalao || !selectedProfissionalId) {
      setErroTela("Selecione um profissional para sincronizar com o Google Agenda.");
      return;
    }

    setGoogleCalendarSyncing(true);
    setErroTela("");

    try {
      const response = await fetch("/api/agenda/google-calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao,
          profissionalId: selectedProfissionalId,
          viewMode,
          data: format(currentDate, "yyyy-MM-dd"),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        total?: number;
        requiresConfig?: boolean;
        requiresConnection?: boolean;
        requiresPlan?: boolean;
        connectUrl?: string;
        nextSuggestion?: string;
      };

      if (!response.ok || !payload.ok) {
        if (payload.requiresPlan) {
          abrirAviso(
            "Integração disponível no Pro e Premium",
            "A sincronização com Google Calendar fica liberada no plano Pro, no plano Premium ou durante o teste grátis ativo de 15 dias.",
            "warning",
            "/comparar-planos"
          );
          return;
        }

        if (payload.requiresConnection || payload.requiresConfig) {
          abrirAviso(
            "Configure a integração com Google Calendar",
            "Conecte o Google Calendar no Perfil do Salão para sincronizar a agenda automaticamente.",
            "warning",
            "/perfil-salao?google_calendar=configure"
          );
          return;
        }
        throw new Error(
          payload.error || "Não foi possível preparar o Google Agenda."
        );
      }

      if (!payload.total) {
        setErroTela(
          payload.nextSuggestion ||
            "Nenhum atendimento confirmado neste período para sincronizar."
        );
        return;
      }

      setErroTela(
        payload.nextSuggestion ||
          `${payload.total} atendimento(s) sincronizado(s) com o Google Calendar.`
      );
    } catch (error) {
      setErroTela(
        error instanceof Error
          ? error.message
          : "Erro ao sincronizar com Google Agenda."
      );
    } finally {
      setGoogleCalendarSyncing(false);
    }
  }

  const sidebarPanel: AgendaSidebarPanel | null = motivoModal.open
    ? {
        title: motivoModal.title || "Motivo da exclusao",
        subtitle: "Escreva o motivo antes de concluir a exclusao.",
        onBack: () => {
          fecharMotivo();
          setSidebarView("overview");
        },
        content: (
          <ReasonSidebarPanel
            modal={motivoModal}
            loading={motivoLoading}
            onChangeValue={setMotivoValor}
            onConfirm={executarMotivo}
            onCancel={() => {
              fecharMotivo();
              setSidebarView("overview");
            }}
          />
        ),
      }
    : confirmModal.open
      ? {
          title: confirmModal.title || "Confirmar ação",
          subtitle: "Revise a ação antes de continuar.",
          onBack: () => {
            fecharConfirmacao();
            setSidebarView("overview");
          },
          content: (
            <ConfirmSidebarPanel
              modal={confirmModal}
              loading={confirmLoading}
              onConfirm={executarConfirmacao}
              onCancel={() => {
                fecharConfirmacao();
                setSidebarView("overview");
              }}
            />
          ),
        }
      : avisoModal.open
        ? {
            title: avisoModal.title || "Aviso da agenda",
            subtitle: "Veja a mensagem antes de continuar.",
            onBack: () => {
              fecharAviso();
              setSidebarView("overview");
            },
            content: (
              <NoticeSidebarPanel
                modal={avisoModal}
                onClose={() => {
                  fecharAviso();
                  setSidebarView("overview");
                }}
              />
            ),
          }
        : modalOpen
              ? {
                title:
                  modalMode === "agendamento"
                    ? editingItem
                      ? "Editar agendamento"
                      : "Novo agendamento"
                    : editingBlock
                      ? "Editar bloqueio"
                      : "Novo bloqueio",
                subtitle:
                  modalMode === "agendamento"
                    ? "Edite servico, horario, cliente e status sem sair da agenda."
                    : "Defina ausencia, pausa ou bloqueio da profissional.",
                onBack: () => {
                  closeModal();
                  setSidebarView("overview");
                },
                content: (
                  <AgendaModal
                    open={modalOpen}
                    mode={modalMode}
                    editingItem={editingItem}
                    editingBlock={editingBlock}
                    onClose={() => {
                      closeModal();
                      setSidebarView("overview");
                    }}
                    onBack={() => {
                      closeModal();
                      setSidebarView("overview");
                    }}
                    onSave={handleSave}
                    onCancelAppointment={handleCancelAppointment}
                    profissionais={profissionais}
                    clientes={clientes}
                    servicos={servicos}
                    selectedProfissionalId={selectedProfissionalId}
                    idSalao={idSalao}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    initialBlockEndTime={selectedBlockEndTime}
                    initialBlockReason={selectedBlockReason}
                    onBuscarComandasAbertas={buscarComandasAbertasDoCliente}
                    onCriarComanda={criarNovaComanda}
                    variant="sidebar"
                  />
                ),
              }
            : clienteProfileOpen
              ? {
                  title: "Perfil da cliente",
                  subtitle: "Histórico recente, observações e leitura rápida da cliente.",
                  onBack: () => {
                    setClienteProfileOpen(false);
                    setSidebarView("overview");
                  },
                  content: (
                    <AgendaClientProfileModal
                      open={clienteProfileOpen}
                      loading={clienteProfileLoading}
                      clienteNome={clienteProfileNome}
                      clienteWhatsapp={clienteProfileWhatsapp}
                      creditoDisponivel={clienteProfileCredito}
                      historico={clienteProfileHistorico}
                      onClose={() => {
                        setClienteProfileOpen(false);
                        setSidebarView("overview");
                      }}
                      variant="sidebar"
                    />
                  ),
                }
              : creditModalOpen
                  ? {
                    title: "Crédito da cliente",
                    subtitle: "Registre saldo para uso futuro sem criar venda.",
                    onBack: () => {
                      setCreditModalOpen(false);
                      resetCreditForm();
                      setSidebarView("overview");
                    },
                    content: (
                      <AgendaCreditModal
                        open={creditModalOpen}
                        clienteId={creditClienteId}
                        valor={creditValue}
                        observacao={creditObservation}
                        loading={creditLoading}
                        clientesOptions={clientes.map((cliente) => ({
                          value: cliente.id,
                          label: cliente.nome,
                          description: cliente.whatsapp || "",
                        }))}
                        onClose={() => {
                          setCreditModalOpen(false);
                          resetCreditForm();
                          setSidebarView("overview");
                        }}
                        onClienteChange={setCreditClienteId}
                        onValorChange={setCreditValue}
                        onObservacaoChange={setCreditObservation}
                        onSubmit={handleOpenCreditFlow}
                        variant="sidebar"
                      />
                    ),
                  }
                : null;

  return (
    <>
      <div
        className={
          showFocusMode
            ? "fixed inset-0 z-[320] flex min-h-0 flex-col gap-2.5 bg-white p-2 md:p-3"
            : isStandaloneAgendaRoute
              ? "flex h-dvh min-h-dvh min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#fdfcff_0%,#fafbfe_38%,#f5f7fb_100%)] p-2"
              : densityMode === "reception"
                ? "flex h-[calc(100dvh-4.45rem)] min-h-[620px] min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#faf6ff_0%,#f8fafc_24%,#f3f6fb_58%,#eef2f7_100%)] p-2"
                : "flex h-[calc(100dvh-4.55rem)] min-h-[640px] min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#faf6ff_0%,#f8fafc_24%,#f3f6fb_58%,#eef2f7_100%)] p-2"
        }
      >
        <div
          className={`grid h-full min-h-0 min-w-0 gap-2.5 ${
            sidebarOpen
              ? "lg:grid-cols-[minmax(0,1fr)_318px] xl:grid-cols-[minmax(0,1fr)_332px] 2xl:grid-cols-[minmax(0,1fr)_380px]"
              : "lg:grid-cols-[minmax(0,1fr)]"
          }`}
        >
          <div className="flex min-h-0 min-w-0 flex-col gap-2.5">
            <ProfissionaisBar
              profissionais={profissionais}
              selectedProfissionalId={selectedProfissionalId}
              densityMode={densityMode}
              onSelect={setSelectedProfissionalId}
            />

            <AgendaToolbar
              currentDate={currentDate}
              viewMode={viewMode}
              selectedProfessionalName={selectedProfissional?.nome || ""}
              selectedProfessionalRole={
                selectedProfissional?.cargo || selectedProfissional?.categoria || ""
              }
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
              onSelectDate={setCurrentDate}
              onGoogleCalendarSync={handleGoogleCalendarSync}
              googleCalendarSyncing={googleCalendarSyncing}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => {
                setSidebarOpen((prev) => !prev);
                if (sidebarOpen) {
                  setSidebarView("overview");
                }
              }}
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

            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
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
                densityMode={densityMode}
                onClickSlot={openSlotMenu}
                onResizeEvent={handleResizeEvent}
                onMoveEvent={handleMoveEvent}
                onEditEvent={openAppointmentMenu}
                onDeleteEvent={handleDeleteEvent}
                onGoToCashier={handleGoToCashier}
                onEditBlock={handleEditBlock}
                onDeleteBlock={handleDeleteBlock}
                onMoveBlock={handleMoveBlock}
                onResizeBlock={handleResizeBlock}
                isExpanded={agendaExpanded}
              />
            </div>
          </div>

          <div className="min-h-0">
            <AgendaSidebar
              open={sidebarOpen}
              view={sidebarView}
              panel={sidebarPanel}
              currentMonthLabel={format(currentDate, "MMMM", { locale: ptBR })}
              totalValueLabel={currencyFormatter.format(valorPotencial)}
              potentialValueVisible={potentialValueVisible}
              totalValueCaption={totalValueCaption}
              appointmentsCount={totalAtendimentos}
              waitingPaymentCount={aguardandoPagamento}
              blockedCount={totalBloqueios}
              attendedCount={statusCounts.atendido}
              statusCounts={statusCounts}
              viewMode={viewMode}
              densityMode={densityMode}
              clientSearchQuery={clientSearchQuery}
              clientResults={clientSearchResults}
              waitlistItems={waitlistItems}
              onToggleOpen={() => {
                setSidebarOpen(false);
                closeSidebarPanels();
              }}
              onBackToOverview={() => setSidebarView("overview")}
              onSetView={setSidebarView}
              onChangeView={setViewMode}
              onChangeDensityMode={setDensityMode}
              onToday={() => setCurrentDate(new Date())}
              onTogglePotentialValueVisible={() =>
                setPotentialValueVisible((prev) => !prev)
              }
              onOpenCreate={() => openCreateModal(defaultSlotDate, defaultSlotTime)}
              onOpenBlock={() => openBlockModal(defaultSlotDate, defaultSlotTime)}
              onOpenCredit={() => setCreditModalOpen(true)}
              onOpenCashier={() => openCashierWindow("/caixa")}
              onOpenClientSearch={() => {
                setClientSearchQuery("");
                setClientCreateOpen(false);
                setSidebarView("clientSearch");
              }}
              onOpenWaitlist={() => setSidebarView("waitlist")}
              onClientSearchQueryChange={setClientSearchQuery}
              clientCreateOpen={clientCreateOpen}
              clientCreateName={clientCreateName}
              clientCreateWhatsapp={clientCreateWhatsapp}
              clientCreateSaving={clientCreateSaving}
              onCreateClient={handleCreateClientFromSidebar}
              onStartCreateClient={handleStartCreateClient}
              onCancelCreateClient={handleCancelCreateClient}
              onCreateClientNameChange={setClientCreateName}
              onCreateClientWhatsappChange={setClientCreateWhatsapp}
              onOpenClient={openClientProfileFromSearch}
            />
          </div>
        </div>
      </div>
      <AgendaContextMenu
        open={contextMenu.open}
        x={contextMenu.open ? contextMenu.x : 12}
        y={contextMenu.open ? contextMenu.y : 12}
        title={
          contextMenu.open && contextMenu.type === "appointment"
            ? contextMenu.item.cliente?.nome || "Agendamento"
            : "Horário livre"
        }
        subtitle={
          contextMenu.open && contextMenu.type === "appointment"
            ? `${normalizeTimeString(contextMenu.item.hora_inicio)} - ${normalizeTimeString(
                contextMenu.item.hora_fim
              )}`
            : `${selectedDate} as ${selectedTime}`
        }
        sections={
          contextMenu.open && contextMenu.type === "appointment"
            ? (() => {
                const item = contextMenu.item;
                const hasClosedComanda = ["fechada", "cancelada"].includes(
                  String(item.comanda_status || "").toLowerCase()
                );
                const isInteractiveStatus = [
                  "pendente",
                  "confirmado",
                  "atendido",
                ].includes(item.status);
                const isWaitingCashierStatus =
                  item.status === "aguardando_pagamento";
                const canReceiveFromClient =
                  !hasClosedComanda &&
                  (isInteractiveStatus || isWaitingCashierStatus);
                const isCanceledAppointment =
                  String(item.status || "").toLowerCase() === "cancelado";
                const canDelete =
                  isCanceledAppointment ||
                  (!item.id_comanda &&
                    !hasClosedComanda &&
                    isInteractiveStatus);
                const canEdit = !hasClosedComanda && isInteractiveStatus;
                const canCancel = !hasClosedComanda && isInteractiveStatus;
                const canChangeStatus =
                  !hasClosedComanda &&
                  (isInteractiveStatus || isWaitingCashierStatus);

                const quickActions = [
                  {
                    label: "Abrir perfil da cliente",
                    description:
                      "Veja histórico recente, observações e leitura rápida da cliente.",
                    icon: UserRound,
                    onClick: () => void openClientProfile(item),
                  },
                  ...(canReceiveFromClient
                    ? [
                        {
                          label: "Receber do cliente",
                          description: item.id_comanda
                            ? "Abre a comanda atual direto no caixa para seguir com o recebimento."
                            : "Cria ou reaproveita a comanda da cliente e leva esse agendamento para o caixa.",
                          icon: Wallet,
                          onClick: () => void handleReceiveFromClient(item),
                        },
                      ]
                    : []),
                  ...(canEdit
                    ? [
                        {
                          label: "Reagendar cliente",
                          description:
                            "Abre o atendimento no painel lateral para trocar data e horário.",
                          icon: CalendarClock,
                          onClick: () => openEditModal(item),
                        },
                        {
                          label: "Editar agendamento",
                          description:
                            "Abra o formulario completo e ajuste serviço, horário e observações.",
                          icon: PencilLine,
                          onClick: () => openEditModal(item),
                        },
                      ]
                    : []),
                  ...(canDelete
                    ? [
                        {
                          label: "Excluir agendamento",
                          description:
                            "Remove o horário da agenda e registra a operação no histórico.",
                          icon: Trash2,
                          tone: "danger" as const,
                          onClick: () => void handleDeleteEvent(item),
                        },
                      ]
                    : []),
                  ...(canCancel
                    ? [
                        {
                          label: "Cancelar agendamento",
                          description:
                            "Cancela o agendamento e ajusta a comanda vinculada quando existir.",
                          icon: Ban,
                          tone: "danger" as const,
                          onClick: () => void handleCancelAppointment(item),
                        },
                      ]
                    : []),
                ];

                const statusActions = canChangeStatus
                  ? [
                      {
                        label: "Marcar como confirmado",
                        description: "Sinal verde para recepção e para o profissional.",
                        icon: CheckCircle2,
                        onClick: () => void handleQuickStatusChange(item, "confirmado"),
                      },
                      {
                        label: "Marcar como pendente",
                        description:
                          "Deixa claro que ainda falta resposta ou confirmação.",
                        icon: ClipboardList,
                        onClick: () => void handleQuickStatusChange(item, "pendente"),
                      },
                      {
                        label: "Marcar como atendido",
                        description:
                          "Use quando o atendimento já estiver concluido na agenda.",
                        icon: CheckCircle2,
                        onClick: () => void handleQuickStatusChange(item, "atendido"),
                      },
                    ]
                  : [];

                return [
                  {
                    title: "Ações rapidas",
                    actions: quickActions,
                  },
                  ...(statusActions.length > 0
                    ? [
                        {
                          title: "Troca rápida de status",
                          actions: statusActions,
                        },
                      ]
                    : []),
                ];
              })()
            : [
                {
                  title: "Criar ou registrar",
                  actions: [
                    {
                      label: "Novo agendamento",
                      description: "Abre o modal organizado já no horário que você clicou.",
                      icon: CalendarPlus,
                      onClick: () => openCreateModal(selectedDate, selectedTime),
                    },
                    {
                      label: "Registrar crédito da cliente",
                      description:
                        "Lanca saldo para a cliente usar depois, sem criar venda.",
                      icon: Wallet,
                      onClick: () => setCreditModalOpen(true),
                    },
                  ],
                },
                {
                  title: "Ausencia do profissional",
                  actions: [
                    {
                      label: "Almoco 30 min",
                      description: "Bloqueio rápido para pausa curta do profissional.",
                      icon: Coffee,
                      badge: "30 min",
                      onClick: () =>
                        openBlockModal(selectedDate, selectedTime, {
                          endTime: addMinutesToSlotTime(selectedTime, 30),
                          reason: "Almoco",
                        }),
                    },
                    {
                      label: "Almoco 1 hora",
                      description: "Bloqueio pronto para pausa completa.",
                      icon: Coffee,
                      badge: "60 min",
                      onClick: () =>
                        openBlockModal(selectedDate, selectedTime, {
                          endTime: addMinutesToSlotTime(selectedTime, 60),
                          reason: "Almoco",
                        }),
                    },
                    {
                      label: "Outro bloqueio",
                      description: "Abra o modal de ausência e defina motivo e horário final.",
                      icon: Ban,
                      onClick: () => openBlockModal(selectedDate, selectedTime),
                    },
                  ],
                },
              ]
        }
        onClose={() => {
          setContextMenu({ open: false });
          setSlotActionOpen(false);
        }}
      />
    </>
  );
}

function NoticeSidebarPanel({
  modal,
  onClose,
}: {
  modal: AgendaPageNoticeState;
  onClose: () => void;
}) {
  const toneClasses =
    modal.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : modal.tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className={`rounded-[20px] border px-4 py-4 ${toneClasses}`}>
        <div className="text-base font-bold">{modal.title}</div>
        <div className="mt-2 text-sm leading-6">{modal.message}</div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

function ConfirmSidebarPanel({
  modal,
  loading,
  onCancel,
  onConfirm,
}: {
  modal: AgendaPageConfirmState;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const confirmToneButton =
    modal.tone === "danger"
      ? "bg-red-600 hover:bg-red-500"
      : modal.tone === "warning"
        ? "bg-amber-600 hover:bg-amber-500"
        : "bg-zinc-950 hover:bg-zinc-800";

  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="text-lg font-bold text-zinc-950">{modal.title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-600">{modal.message}</div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          Fechar
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => void onConfirm()}
          className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${confirmToneButton}`}
        >
          {loading ? "Processando..." : modal.confirmLabel}
        </button>
      </div>
    </div>
  );
}

function ReasonSidebarPanel({
  modal,
  loading,
  onChangeValue,
  onCancel,
  onConfirm,
}: {
  modal: AgendaPageReasonState;
  loading: boolean;
  onChangeValue: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="text-lg font-bold text-zinc-950">{modal.title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-600">{modal.message}</div>

      <textarea
        value={modal.value}
        onChange={(event) => onChangeValue(event.target.value)}
        placeholder="Digite o motivo..."
        className="mt-4 min-h-[140px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 outline-none"
      />

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          Fechar
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => void onConfirm()}
          className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Confirmar exclusao"}
        </button>
      </div>
    </div>
  );
}
