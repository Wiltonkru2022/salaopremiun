"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePathname, useRouter } from "next/navigation";
import AgendaToolbar from "@/components/agenda/AgendaToolbar";
import AgendaGrid from "@/components/agenda/AgendaGrid";
import AgendaSidebar from "@/components/agenda/AgendaSidebar";
import AgendaInstallPrompt from "@/components/agenda/AgendaInstallPrompt";
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
import {
  Ban,
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
  const [creditLoading, setCreditLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<AgendaSidebarView>("overview");
  const [potentialValueVisible, setPotentialValueVisible] = useState(true);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const [clientCreateName, setClientCreateName] = useState("");
  const [clientCreateWhatsapp, setClientCreateWhatsapp] = useState("");
  const [clientCreateSaving, setClientCreateSaving] = useState(false);

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

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadAgenda();
    }, 8000);

    return () => window.clearInterval(interval);
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
        "Sua assinatura esta vencida. Regularize para acessar o caixa.",
        "danger",
        "/assinatura"
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
        message: "Usuario abriu o caixa a partir de um agendamento ja vinculado.",
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
        "Nao encontrei o servico ou a profissional desse agendamento para abrir no caixa.",
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
        message: "Usuario enviou o agendamento para o caixa.",
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
          "Nao foi possivel abrir esse agendamento no caixa agora."
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
        "Escolha a cliente antes de abrir o credito no caixa.",
        "warning"
      );
      return;
    }

    try {
      setCreditLoading(true);
      const comandas = await buscarComandasAbertasDoCliente(creditClienteId);
      const comanda = comandas[0] || (await criarNovaComanda(creditClienteId));

      setCreditModalOpen(false);
      setCreditClienteId("");
      openCashierWindow(`/caixa?comanda_id=${comanda.id}`);
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Erro ao abrir credito",
        "Nao foi possivel abrir a comanda da cliente no caixa agora.",
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
        "Historico parcial",
        "Nao foi possivel carregar o historico completo agora. Vou abrir pelo menos os dados do agendamento atual.",
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
        message="Aguarde enquanto organizamos horarios, profissionais e atendimentos do periodo."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.agenda_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Voce nao tem permissao para acessar a agenda.
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {erroTela || "Nao foi possivel carregar as configuracoes do salao."}
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
      if (!normalizedClientSearch) return true;

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

    window.open(href, "_blank", "noopener,noreferrer");
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
      abrirAviso("Salao indisponivel", "Nao foi possivel identificar o salao atual.");
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
        throw new Error(data.error || "Nao foi possivel cadastrar a cliente.");
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
      abrirAviso("Cliente criado", "Cadastro rapido concluido com sucesso.");
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
      setCreditClienteId("");
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
          title: confirmModal.title || "Confirmar acao",
          subtitle: "Revise a acao antes de continuar.",
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
                  subtitle: "Historico recente, observacoes e leitura rapida da cliente.",
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
                    title: "Credito da cliente",
                    subtitle: "Abra ou vincule a comanda certa sem sair da agenda.",
                    onBack: () => {
                      setCreditModalOpen(false);
                      setCreditClienteId("");
                      setSidebarView("overview");
                    },
                    content: (
                      <AgendaCreditModal
                        open={creditModalOpen}
                        clienteId={creditClienteId}
                        loading={creditLoading}
                        clientesOptions={clientes.map((cliente) => ({
                          value: cliente.id,
                          label: cliente.nome,
                          description: cliente.whatsapp || "",
                        }))}
                        onClose={() => {
                          setCreditModalOpen(false);
                          setCreditClienteId("");
                          setSidebarView("overview");
                        }}
                        onClienteChange={setCreditClienteId}
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
            ? "fixed inset-0 z-[320] flex min-h-0 flex-col gap-4 bg-white p-3 md:p-4"
            : isStandaloneAgendaRoute
              ? "flex h-dvh min-h-dvh min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#fdfcff_0%,#fafbfe_38%,#f5f7fb_100%)] p-3"
              : densityMode === "reception"
                ? "flex h-[calc(100dvh-4.9rem)] min-h-[720px] min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#faf6ff_0%,#f8fafc_24%,#f3f6fb_58%,#eef2f7_100%)] p-3"
                : "flex h-[calc(100dvh-5.2rem)] min-h-[700px] min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#faf6ff_0%,#f8fafc_24%,#f3f6fb_58%,#eef2f7_100%)] p-3"
        }
      >
        <div
          className={`grid h-full min-h-0 min-w-0 gap-3 ${
            sidebarOpen
              ? "lg:grid-cols-[minmax(0,1fr)_436px] xl:grid-cols-[minmax(0,1fr)_456px]"
              : "lg:grid-cols-[minmax(0,1fr)]"
          }`}
        >
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
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
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => {
                setSidebarOpen((prev) => !prev);
                if (sidebarOpen) {
                  setSidebarView("overview");
                }
              }}
            />

            {isStandaloneAgendaRoute ? <AgendaInstallPrompt /> : null}

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
              onOpenClient={(clientId) => router.push(`/clientes/${clientId}`)}
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
            : "Horario livre"
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
                const canDelete =
                  !item.id_comanda &&
                  !hasClosedComanda &&
                  isInteractiveStatus;
                const canEdit = !hasClosedComanda && isInteractiveStatus;
                const canCancel = !hasClosedComanda && isInteractiveStatus;
                const canChangeStatus =
                  !hasClosedComanda &&
                  (isInteractiveStatus || isWaitingCashierStatus);

                const quickActions = [
                  {
                    label: "Abrir perfil da cliente",
                    description:
                      "Veja historico recente, observacoes e leitura rapida da cliente.",
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
                          label: "Editar agendamento",
                          description:
                            "Abra o formulario completo e ajuste servico, horario e observacoes.",
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
                            "Remove o horario da agenda e registra a operacao no historico.",
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
                        description: "Sinal verde para recepcao e para o profissional.",
                        icon: CheckCircle2,
                        onClick: () => void handleQuickStatusChange(item, "confirmado"),
                      },
                      {
                        label: "Marcar como pendente",
                        description:
                          "Deixa claro que ainda falta resposta ou confirmacao.",
                        icon: ClipboardList,
                        onClick: () => void handleQuickStatusChange(item, "pendente"),
                      },
                      {
                        label: "Marcar como atendido",
                        description:
                          "Use quando o atendimento ja estiver concluido na agenda.",
                        icon: CheckCircle2,
                        onClick: () => void handleQuickStatusChange(item, "atendido"),
                      },
                    ]
                  : [];

                return [
                  {
                    title: "Acoes rapidas",
                    actions: quickActions,
                  },
                  ...(statusActions.length > 0
                    ? [
                        {
                          title: "Troca rapida de status",
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
                      description: "Abre o modal organizado ja no horario que voce clicou.",
                      icon: CalendarPlus,
                      onClick: () => openCreateModal(selectedDate, selectedTime),
                    },
                    {
                      label: "Registrar credito da cliente",
                      description:
                        "Escolha a cliente e eu abro ou crio a comanda certa no caixa.",
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
                      description: "Bloqueio rapido para pausa curta do profissional.",
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
                      description: "Abra o modal de ausencia e defina motivo e horario final.",
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

