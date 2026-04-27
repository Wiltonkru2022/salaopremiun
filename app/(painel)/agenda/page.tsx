"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePathname, useRouter } from "next/navigation";
import AgendaToolbar from "@/components/agenda/AgendaToolbar";
import AgendaGrid from "@/components/agenda/AgendaGrid";
import AgendaSidebar from "@/components/agenda/AgendaSidebar";
import type {
  AgendaSidebarView,
  AgendaWaitlistItem,
} from "@/components/agenda/AgendaSidebar";
import AgendaModal from "@/components/agenda/AgendaModal";
import ProfissionaisBar from "@/components/agenda/ProfissionaisBar";
import AgendaNoticeDialog from "@/components/agenda/AgendaNoticeDialog";
import AgendaConfirmDialog from "@/components/agenda/AgendaConfirmDialog";
import AgendaReasonDialog from "@/components/agenda/AgendaReasonDialog";
import AgendaContextMenu from "@/components/agenda/AgendaContextMenu";
import AgendaClientProfileModal from "@/components/agenda/AgendaClientProfileModal";
import AgendaCreditModal from "@/components/agenda/AgendaCreditModal";
import type { ComandaResumo } from "@/components/agenda/page-types";
import { useAgendaActions } from "@/components/agenda/useAgendaActions";
import { useAgendaData } from "@/components/agenda/useAgendaData";
import { useAgendaMutations } from "@/components/agenda/useAgendaMutations";
import { useAgendaPageState } from "@/components/agenda/useAgendaPageState";
import { useAgendaFeedback } from "@/components/agenda/useAgendaFeedback";
import {
  buscarComandasAbertasDoClienteAgenda,
  criarNovaComandaAgenda,
} from "@/lib/agenda/comandasAgenda";
import { captureClientEvent } from "@/lib/monitoring/client";
import { sanitizeDiasFuncionamento } from "@/lib/utils/agenda";
import type { Agendamento, ConfigSalao } from "@/types/agenda";
import { normalizeTimeString } from "@/lib/utils/agenda";
import {
  BadgeDollarSign,
  Ban,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Coffee,
  PencilLine,
  Receipt,
  Trash2,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";

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
  const [clienteProfileHistorico, setClienteProfileHistorico] = useState<
    ClienteHistoricoItem[]
  >([]);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditClienteId, setCreditClienteId] = useState("");
  const [creditLoading, setCreditLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<AgendaSidebarView>("overview");
  const [potentialValueVisible, setPotentialValueVisible] = useState(true);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");

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

  function handleGoToCashier(item: Agendamento) {
    if (assinaturaBloqueada) {
      abrirAviso(
        "Acesso bloqueado",
        "Sua assinatura esta vencida. Regularize para acessar o caixa.",
        "danger",
        "/assinatura"
      );
      return;
    }

    void captureClientEvent({
      module: "agenda",
      eventType: "ui_event",
      action: "abrir_caixa_por_agendamento",
      screen: "agenda_grid",
      entity: "agendamento",
      entityId: item.id,
      message: "Usuario abriu o caixa a partir de um agendamento.",
      details: {
        idSalao,
        idComanda: item.id_comanda || null,
      },
      success: true,
    });

    if (item.id_comanda) {
      router.push(`/caixa?comanda_id=${item.id_comanda}`);
      return;
    }

    router.push(`/caixa?agendamento_id=${item.id}`);
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
      router.push(`/caixa?comanda_id=${comanda.id}`);
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

    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(
          "id, data, hora_inicio, hora_fim, status, observacoes, servicos(nome)"
        )
        .eq("id_salao", idSalao)
        .eq("cliente_id", item.cliente_id)
        .order("data", { ascending: false })
        .order("hora_inicio", { ascending: false })
        .limit(12);

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

  if (loading || !acessoCarregado) {
    return <div className="p-6">Carregando agenda...</div>;
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
  const potentialGoal = 20000;
  const potentialProgress =
    potentialGoal > 0 ? (valorPotencial / potentialGoal) * 100 : 0;
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
              ? "lg:grid-cols-[minmax(0,1fr)_292px]"
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
              currentMonthLabel={format(currentDate, "MMMM", { locale: ptBR })}
              potentialValueLabel={currencyFormatter.format(valorPotencial)}
              potentialValueVisible={potentialValueVisible}
              potentialGoalLabel={`Meta do mes: ${currencyFormatter.format(potentialGoal)}`}
              potentialProgress={potentialProgress}
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
                setSidebarView("overview");
              }}
              onBackToOverview={() => setSidebarView("overview")}
              onChangeView={setViewMode}
              onChangeDensityMode={setDensityMode}
              onToday={() => setCurrentDate(new Date())}
              onTogglePotentialValueVisible={() =>
                setPotentialValueVisible((prev) => !prev)
              }
              onOpenCreate={() => {
                setQuickCreateDate(defaultSlotDate);
                setQuickCreateOpen(true);
              }}
              onOpenBlock={() => openBlockModal(defaultSlotDate, defaultSlotTime)}
              onOpenCredit={() => setCreditModalOpen(true)}
              onOpenCashier={() => router.push("/caixa")}
              onOpenClientSearch={() => {
                setClientSearchQuery("");
                setSidebarView("clientSearch");
              }}
              onOpenWaitlist={() => setSidebarView("waitlist")}
              onClientSearchQueryChange={setClientSearchQuery}
              onCreateClient={() => router.push("/clientes/novo")}
              onOpenClient={(clientId) => router.push(`/clientes/${clientId}`)}
            />
          </div>
        </div>

        <AgendaModal
          open={modalOpen}
          mode={modalMode}
          editingItem={editingItem}
          editingBlock={editingBlock}
          onClose={closeModal}
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
        />
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
            ? [
                {
                  title: "Acoes rapidas",
                  actions: [
                    {
                      label: "Abrir perfil da cliente",
                      description: "Veja historico recente, observacoes e leitura rapida da cliente.",
                      icon: UserRound,
                      onClick: () => void openClientProfile(contextMenu.item),
                    },
                    {
                      label: "Editar agendamento",
                      description: "Abra o formulario completo e ajuste servico, horario e observacoes.",
                      icon: PencilLine,
                      onClick: () => openEditModal(contextMenu.item),
                    },
                    {
                      label: "Receber do cliente",
                      description: "Vai para o caixa, abre a comanda e cria uma nova se ainda nao existir.",
                      icon: Receipt,
                      onClick: () => handleGoToCashier(contextMenu.item),
                    },
                    {
                      label: "Excluir agendamento",
                      description: "Remove o horario da agenda e registra a operacao no historico.",
                      icon: Trash2,
                      tone: "danger",
                      onClick: () => void handleDeleteEvent(contextMenu.item),
                    },
                  ],
                },
                {
                  title: "Troca rapida de status",
                  actions: [
                    {
                      label: "Marcar como confirmado",
                      description: "Sinal verde para recepcao e para o profissional.",
                      icon: CheckCircle2,
                      onClick: () =>
                        void handleQuickStatusChange(contextMenu.item, "confirmado"),
                    },
                    {
                      label: "Marcar como pendente",
                      description: "Deixa claro que ainda falta resposta ou confirmacao.",
                      icon: ClipboardList,
                      onClick: () =>
                        void handleQuickStatusChange(contextMenu.item, "pendente"),
                    },
                    {
                      label: "Marcar como atendido",
                      description: "Marca o atendimento como concluido na operacao.",
                      icon: BadgeDollarSign,
                      onClick: () =>
                        void handleQuickStatusChange(contextMenu.item, "atendido"),
                    },
                    {
                      label: "Mandar para receber",
                      description: "Joga o agendamento para a fila do caixa.",
                      icon: Wallet,
                      onClick: () =>
                        void handleQuickStatusChange(
                          contextMenu.item,
                          "aguardando_pagamento"
                        ),
                    },
                    {
                      label: "Cancelar agendamento",
                      description: "Abre o fluxo de cancelamento e registra o motivo.",
                      icon: XCircle,
                      tone: "warning",
                      onClick: () => void handleCancelAppointment(contextMenu.item),
                    },
                  ],
                },
              ]
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
      <AgendaClientProfileModal
        open={clienteProfileOpen}
        loading={clienteProfileLoading}
        clienteNome={clienteProfileNome}
        clienteWhatsapp={clienteProfileWhatsapp}
        historico={clienteProfileHistorico}
        onClose={() => setClienteProfileOpen(false)}
      />
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
        }}
        onClienteChange={setCreditClienteId}
        onSubmit={handleOpenCreditFlow}
      />
      {quickCreateOpen ? (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[420px] rounded-[26px] border border-zinc-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Novo agendamento
            </div>
            <h3 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] text-slate-900">
              Escolha o dia do atendimento
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Depois eu abro o modal principal da agenda ja na data escolhida.
            </p>

            <input
              type="date"
              value={quickCreateDate}
              onChange={(event) => setQuickCreateDate(event.target.value)}
              className="mt-4 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setQuickCreateOpen(false)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!quickCreateDate) return;
                  setQuickCreateOpen(false);
                  openCreateModal(quickCreateDate, defaultSlotTime);
                }}
                className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
