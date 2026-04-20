"use client";

import { useEffect, useRef } from "react";
import { addDays, subDays } from "date-fns";
import { useRouter } from "next/navigation";
import AgendaToolbar from "@/components/agenda/AgendaToolbar";
import AgendaGrid from "@/components/agenda/AgendaGrid";
import AgendaModal from "@/components/agenda/AgendaModal";
import ProfissionaisBar from "@/components/agenda/ProfissionaisBar";
import AgendaNoticeDialog from "@/components/agenda/AgendaNoticeDialog";
import AgendaConfirmDialog from "@/components/agenda/AgendaConfirmDialog";
import AgendaReasonDialog from "@/components/agenda/AgendaReasonDialog";
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
import { formatFullDate, sanitizeDiasFuncionamento } from "@/lib/utils/agenda";
import type { Agendamento, ConfigSalao } from "@/types/agenda";
import { normalizeTimeString } from "@/lib/utils/agenda";

export default function AgendaPage() {
  const router = useRouter();
  const loadAgendaSeqRef = useRef(0);

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
    setAgendaExpanded,
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

    router.push(`/caixa?agendamento_id=${item.id}`);
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

  return (
    <>
      <div
        className={
          agendaExpanded
            ? "fixed inset-0 z-40 flex min-h-0 flex-col gap-1.5 bg-white p-2 md:p-3"
            : densityMode === "reception"
              ? "flex h-[calc(100vh-8.5rem)] min-h-0 flex-col gap-1.5 overflow-hidden bg-white"
              : "flex h-[calc(100vh-9.5rem)] min-h-0 flex-col gap-2 overflow-hidden bg-white"
        }
      >
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
          appointmentsCount={totalAtendimentos}
          waitingPaymentCount={aguardandoPagamento}
          blockedCount={totalBloqueios}
          potentialValue={valorPotencial}
          densityMode={densityMode}
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
          onChangeDensityMode={setDensityMode}
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

        <div className="min-h-0 flex-1 overflow-hidden rounded-[18px] border border-zinc-200 bg-white select-none">
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
          onClose={closeModal}
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
