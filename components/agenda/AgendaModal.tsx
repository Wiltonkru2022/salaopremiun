"use client";

import Link from "next/link";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { useEffect, useState } from "react";
import { CalendarDays, Lock, X } from "lucide-react";
import AgendaModalAviso from "@/components/agenda/AgendaModalAviso";
import AgendaModalComandaDecision from "@/components/agenda/AgendaModalComandaDecision";
import AgendaModalFormAgendamento from "@/components/agenda/AgendaModalFormAgendamento";
import AgendaModalFormBloqueio from "@/components/agenda/AgendaModalFormBloqueio";
import AgendaModalResumo from "@/components/agenda/AgendaModalResumo";
import PlanoLimiteNotice from "@/components/plans/PlanoLimiteNotice";
import {
  type AgendaModalProps,
  useAgendaModal,
} from "@/components/agenda/useAgendaModal";

type Props = AgendaModalProps & {
  variant?: "modal" | "sidebar";
  onBack?: () => void;
};

export default function AgendaModal(props: Props) {
  const {
    open,
    mode,
    editingItem,
    editingBlock,
    onClose,
    onCancelAppointment,
    variant = "modal",
    onBack,
  } = props;

  const {
    saving,
    loadingComanda,
    profissionalId,
    setProfissionalId,
    clienteId,
    servicoId,
    setServicoId,
    horaInicio,
    setHoraInicio,
    observacoes,
    setObservacoes,
    status,
    setStatus,
    horaFimBloqueio,
    setHoraFimBloqueio,
    motivoBloqueio,
    setMotivoBloqueio,
    setComandaId,
    setComandaNumero,
    comandaNumero,
    showComandaDecisionModal,
    setShowComandaDecisionModal,
    comandasAbertasCliente,
    whatsMensagem,
    setWhatsMensagem,
    aviso,
    fecharAviso,
    dicas,
    dicaIndex,
    profissionaisOptions,
    clientesOptions,
    servicosOptions,
    servicoSelecionado,
    profissionalSelecionado,
    clienteSelecionado,
    horaFimPreview,
    getTituloWhatsapp,
    abrirWhatsappMensagem,
    whatsappLiberado,
    handleClienteChange,
    handleAbrirComanda,
    handleCriarNovaComandaParaClienteAtual,
    handleSubmit,
    planoAccess,
    upgradeTarget,
    limiteAgendamentosMensais,
    usoAgendamentosMensais,
    atingiuLimiteAgendamentos,
  } = useAgendaModal(props);

  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(status);

  useEffect(() => {
    if (!open) return;
    setDraftStatus(status);
    setStatusPickerOpen(false);
  }, [open, status]);

  if (!open) return null;

  const statusOptions = [
    { value: "confirmado", label: "Confirmado" },
    { value: "pendente", label: "Pendente" },
    { value: "atendido", label: "Atendido" },
    { value: "cancelado", label: "Cancelado" },
    { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  ] as const;

  const statusLabel =
    statusOptions.find((option) => option.value === status)?.label || "Confirmado";

  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") return;

    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName?.toLowerCase();
    const targetRole = target?.getAttribute("role");
    const targetType = target instanceof HTMLInputElement ? target.type : null;

    if (tagName === "textarea") {
      return;
    }

    if (tagName === "button" || targetType === "submit") {
      return;
    }

    if (targetRole === "option") {
      return;
    }

    event.preventDefault();
  }

  const formBody =
    mode === "agendamento" ? (
      <AgendaModalFormAgendamento
        profissionaisOptions={profissionaisOptions}
        clientesOptions={clientesOptions}
        servicosOptions={servicosOptions}
        profissionalId={profissionalId}
        clienteId={clienteId}
        servicoId={servicoId}
        horaInicio={horaInicio}
        observacoes={observacoes}
        statusLabel={statusLabel}
        loadingComanda={loadingComanda}
        comandaNumero={comandaNumero}
        editingItem={editingItem || null}
        onProfissionalChange={setProfissionalId}
        onClienteChange={handleClienteChange}
        onServicoChange={setServicoId}
        onHoraInicioChange={setHoraInicio}
        onObservacoesChange={setObservacoes}
        onOpenStatusPicker={() => {
          setDraftStatus(status);
          setStatusPickerOpen(true);
        }}
        onAbrirComanda={handleAbrirComanda}
        onCancelAppointment={onCancelAppointment}
      />
    ) : (
      <AgendaModalFormBloqueio
        profissionaisOptions={profissionaisOptions}
        profissionalId={profissionalId}
        horaInicio={horaInicio}
        horaFimBloqueio={horaFimBloqueio}
        motivoBloqueio={motivoBloqueio}
        onProfissionalChange={setProfissionalId}
        onHoraInicioChange={setHoraInicio}
        onHoraFimChange={setHoraFimBloqueio}
        onMotivoChange={setMotivoBloqueio}
      />
    );

  const resumo = (
    <AgendaModalResumo
      mode={mode}
      profissionalSelecionado={profissionalSelecionado}
      clienteSelecionado={clienteSelecionado}
      servicoSelecionado={servicoSelecionado}
      horaInicio={horaInicio}
      horaFimPreview={horaFimPreview}
      horaFimBloqueio={horaFimBloqueio}
      motivoBloqueio={motivoBloqueio}
      comandaNumero={comandaNumero}
      whatsMensagem={whatsMensagem}
      dicas={dicas}
      dicaIndex={dicaIndex}
      tituloWhatsapp={getTituloWhatsapp()}
      whatsappLiberado={whatsappLiberado}
      onChangeWhatsapp={setWhatsMensagem}
      onAbrirWhatsapp={abrirWhatsappMensagem}
    />
  );

  const avisoPlanoAgenda =
    mode === "agendamento" && !editingItem && limiteAgendamentosMensais != null ? (
      <div className="space-y-3">
        <PlanoLimiteNotice
          titulo="Agendamentos mensais controlados pelo plano"
          descricao="A agenda continua disponivel para consulta e edicao. O limite vale para novos horarios criados no mes."
          usado={usoAgendamentosMensais}
          limite={limiteAgendamentosMensais}
          planoNome={planoAccess?.planoNome}
          upgradeTarget={upgradeTarget}
          disabled={atingiuLimiteAgendamentos}
        />

        {atingiuLimiteAgendamentos ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/comparar-planos"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
            >
              Comparar planos
            </Link>
            <Link
              href={getAssinaturaUrl(`/assinatura?plano=${upgradeTarget}`)}
              className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Fazer upgrade
            </Link>
          </div>
        ) : null}
      </div>
    ) : null;

  const overlays = (
    <>
      <AgendaModalAviso
        aviso={aviso}
        onClose={fecharAviso}
        variant={variant}
      />

      <AgendaModalComandaDecision
        open={showComandaDecisionModal}
        comandas={comandasAbertasCliente}
        loading={loadingComanda}
        onClose={() => setShowComandaDecisionModal(false)}
        onCreateNew={handleCriarNovaComandaParaClienteAtual}
        onSelect={(comanda) => {
          setComandaId(comanda.id);
          setComandaNumero(comanda.numero);
          setShowComandaDecisionModal(false);
        }}
        variant={variant}
      />
    </>
  );

  if (variant === "sidebar") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {overlays}

          {!aviso.open && !showComandaDecisionModal && statusPickerOpen ? (
            <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Status do agendamento
              </div>
              <h3 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-900">
                Escolha o status
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                O restante do painel fica oculto ate voce confirmar a troca.
              </p>

              <div className="mt-4 space-y-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDraftStatus(option.value)}
                    className={
                      draftStatus === option.value
                        ? "flex min-h-12 w-full items-center rounded-2xl border border-violet-300 bg-violet-50 px-4 py-3 text-left text-sm font-semibold text-violet-700 shadow-[0_10px_24px_rgba(124,58,237,0.12)] transition duration-200"
                        : "flex min-h-12 w-full items-center rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition duration-200 hover:-translate-y-[1px] hover:bg-zinc-50"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDraftStatus(status);
                    setStatusPickerOpen(false);
                  }}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus(draftStatus);
                    setStatusPickerOpen(false);
                  }}
                  className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Confirmar
                </button>
              </div>
            </div>
          ) : null}

          {!aviso.open && !showComandaDecisionModal && !statusPickerOpen ? (
            <form
              onSubmit={handleSubmit}
              onKeyDown={handleFormKeyDown}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="space-y-4">
                {avisoPlanoAgenda}
                {formBody}
                <div className="border-t border-zinc-200 pt-4">{resumo}</div>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Voltar
                  </button>
                ) : null}

                <button
                  type="submit"
                  disabled={saving || atingiuLimiteAgendamentos}
                  className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      {overlays}

      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm">
        <div className="flex h-[min(88vh,760px)] w-full max-w-[1080px] flex-col overflow-hidden rounded-[24px] border border-white/30 bg-white shadow-2xl">
          <div className="border-b border-zinc-200 bg-white px-4 py-3 md:px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {mode === "agendamento" ? (
                    <>
                      <CalendarDays size={12} />
                      Agenda
                    </>
                  ) : (
                    <>
                      <Lock size={12} />
                      Bloqueio
                    </>
                  )}
                </div>

                <h2 className="text-base font-bold text-zinc-900 md:text-lg">
                  {mode === "agendamento"
                    ? editingItem
                      ? "Editar agendamento"
                      : "Novo agendamento"
                    : editingBlock
                      ? "Editar bloqueio"
                      : "Novo bloqueio"}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            onKeyDown={handleFormKeyDown}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="grid min-h-0 flex-1 lg:grid-cols-[1.7fr_0.9fr]">
              <div className="min-h-0 overflow-y-auto px-4 py-4 md:px-5">
                <div className="space-y-4">
                  {avisoPlanoAgenda}
                  {formBody}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto border-l border-zinc-200 bg-zinc-50/60 px-4 py-4 md:px-5">
                {resumo}
              </div>
            </div>

            <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 md:px-5">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Fechar
                </button>

                <button
                  type="submit"
                  disabled={saving || atingiuLimiteAgendamentos}
                  className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
