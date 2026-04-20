"use client";

import { CalendarDays, Lock, X } from "lucide-react";
import AgendaModalAviso from "@/components/agenda/AgendaModalAviso";
import AgendaModalComandaDecision from "@/components/agenda/AgendaModalComandaDecision";
import AgendaModalFormAgendamento from "@/components/agenda/AgendaModalFormAgendamento";
import AgendaModalFormBloqueio from "@/components/agenda/AgendaModalFormBloqueio";
import AgendaModalResumo from "@/components/agenda/AgendaModalResumo";
import {
  type AgendaModalProps,
  useAgendaModal,
} from "@/components/agenda/useAgendaModal";

export default function AgendaModal(props: AgendaModalProps) {
  const {
    open,
    mode,
    editingItem,
    editingBlock,
    onClose,
    onCancelAppointment,
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
    handleClienteChange,
    handleAbrirComanda,
    handleQuickCreateClient,
    handleCriarNovaComandaParaClienteAtual,
    handleSubmit,
    quickClientOpen,
    setQuickClientOpen,
    quickClientName,
    setQuickClientName,
    quickClientWhatsapp,
    setQuickClientWhatsapp,
    quickClientSaving,
  } = useAgendaModal(props);

  if (!open) return null;

  return (
    <>
      <AgendaModalAviso aviso={aviso} onClose={fecharAviso} />

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
      />

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
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="grid min-h-0 flex-1 lg:grid-cols-[1.7fr_0.9fr]">
              <div className="min-h-0 overflow-y-auto px-4 py-4 md:px-5">
                {mode === "agendamento" ? (
                  <AgendaModalFormAgendamento
                    profissionaisOptions={profissionaisOptions}
                    clientesOptions={clientesOptions}
                    servicosOptions={servicosOptions}
                    profissionalId={profissionalId}
                    clienteId={clienteId}
                    servicoId={servicoId}
                    horaInicio={horaInicio}
                    observacoes={observacoes}
                    status={status}
                    loadingComanda={loadingComanda}
                    comandaNumero={comandaNumero}
                    editingItem={editingItem || null}
                    onProfissionalChange={setProfissionalId}
                    onClienteChange={handleClienteChange}
                    onServicoChange={setServicoId}
                    onHoraInicioChange={setHoraInicio}
                    onObservacoesChange={setObservacoes}
                    onStatusChange={setStatus}
                    onAbrirComanda={handleAbrirComanda}
                    onQuickCreateClient={handleQuickCreateClient}
                    quickClientOpen={quickClientOpen}
                    quickClientName={quickClientName}
                    quickClientWhatsapp={quickClientWhatsapp}
                    quickClientSaving={quickClientSaving}
                    onToggleQuickClient={setQuickClientOpen}
                    onQuickClientNameChange={setQuickClientName}
                    onQuickClientWhatsappChange={setQuickClientWhatsapp}
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
                )}
              </div>

              <div className="min-h-0 overflow-y-auto border-l border-zinc-200 bg-zinc-50/60 px-4 py-4 md:px-5">
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
                  onChangeWhatsapp={setWhatsMensagem}
                  onAbrirWhatsapp={abrirWhatsappMensagem}
                />
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
                  disabled={saving}
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
