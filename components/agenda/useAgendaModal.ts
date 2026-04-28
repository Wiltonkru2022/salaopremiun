"use client";

import { useEffect, useMemo, useState } from "react";
import type { SearchableOption } from "@/components/ui/SearchableSelect";
import type { ComandaResumo } from "./page-types";
import type {
  Agendamento,
  Bloqueio,
  Cliente,
  Profissional,
  Servico,
} from "@/types/agenda";
import {
  addDurationToTime,
  buildWhatsappCancelamentoText,
  buildWhatsappConfirmacaoText,
  normalizeTimeString,
} from "@/lib/utils/agenda";
import { getErrorMessage } from "@/lib/get-error-message";

export type AgendaModalMode = "agendamento" | "bloqueio";

export type AgendaStatus =
  | "confirmado"
  | "pendente"
  | "atendido"
  | "cancelado"
  | "aguardando_pagamento";

export type SaveAgendamentoPayload = {
  tipo: "agendamento";
  id: string | null;
  profissionalId: string;
  clienteId: string;
  servicoId: string;
  idComanda: string | null;
  data: string;
  horaInicio: string;
  observacoes: string;
  status: AgendaStatus;
};

export type SaveBloqueioPayload = {
  tipo: "bloqueio";
  id: string | null;
  profissionalId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  motivo: string;
};

export type SavePayload = SaveAgendamentoPayload | SaveBloqueioPayload;

export type AvisoState = {
  open: boolean;
  title: string;
  message: string;
  tone: "default" | "success" | "warning" | "danger";
};

export type AgendaModalProps = {
  open: boolean;
  mode: AgendaModalMode;
  editingItem?: (Agendamento & {
    id_comanda?: string | null;
    comanda_numero?: number | null;
  }) | null;
  editingBlock?: Bloqueio | null;
  onClose: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
  onCancelAppointment: (item: Agendamento) => Promise<void>;
  profissionais: Profissional[];
  clientes: Cliente[];
  servicos: Servico[];
  idSalao: string;
  selectedProfissionalId: string;
  selectedDate: string;
  selectedTime: string;
  initialBlockEndTime?: string;
  initialBlockReason?: string;
  onBuscarComandasAbertas: (clienteId: string) => Promise<ComandaResumo[]>;
  onCriarComanda: (clienteId: string) => Promise<ComandaResumo>;
};

const DICAS_AGENDA = [
  "Selecione o cliente para verificar se já existe comanda aberta.",
  "O horário final é calculado pela duração do serviço.",
  "Se a cliente já estiver em atendimento, use a mesma comanda.",
  "Ao finalizar, use aguardando pagamento para facilitar o caixa.",
];

export function useAgendaModal({
  open,
  mode,
  editingItem,
  editingBlock,
  onSave,
  profissionais,
  clientes,
  servicos,
  idSalao,
  selectedProfissionalId,
  selectedDate,
  selectedTime,
  initialBlockEndTime,
  initialBlockReason,
  onBuscarComandasAbertas,
  onCriarComanda,
}: AgendaModalProps) {
  const [saving, setSaving] = useState(false);
  const [loadingComanda, setLoadingComanda] = useState(false);

  const [profissionalId, setProfissionalId] = useState(selectedProfissionalId);
  const [clienteId, setClienteId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [horaInicio, setHoraInicio] = useState(selectedTime);
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<AgendaStatus>("confirmado");

  const [horaFimBloqueio, setHoraFimBloqueio] = useState(selectedTime);
  const [motivoBloqueio, setMotivoBloqueio] = useState("");

  const [comandaId, setComandaId] = useState("");
  const [comandaNumero, setComandaNumero] = useState<number | null>(null);

  const [showComandaDecisionModal, setShowComandaDecisionModal] = useState(false);
  const [comandasAbertasCliente, setComandasAbertasCliente] = useState<ComandaResumo[]>([]);

  const [whatsMensagem, setWhatsMensagem] = useState("");
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientWhatsapp, setQuickClientWhatsapp] = useState("");
  const [quickClientSaving, setQuickClientSaving] = useState(false);
  const [quickClientOptions, setQuickClientOptions] = useState<Cliente[]>([]);

  const [aviso, setAviso] = useState<AvisoState>({
    open: false,
    title: "",
    message: "",
    tone: "default",
  });

  const [dicaIndex, setDicaIndex] = useState(0);

  const profissionaisOptions = useMemo<SearchableOption[]>(
    () =>
      profissionais.map((p) => ({
        value: p.id,
        label: p.nome,
        description: p.nome || p.categoria || p.cargo || "",
      })),
    [profissionais]
  );

  const clientesOptions = useMemo<SearchableOption[]>(
    () =>
      [...clientes, ...quickClientOptions].map((c) => ({
        value: c.id,
        label: c.nome,
        description: c.whatsapp || "",
      })),
    [clientes, quickClientOptions]
  );

  const servicosDoProfissional = useMemo(
    () => {
      if (!profissionalId) return [];

      return servicos.filter((servico) =>
        (servico.profissionais_vinculados || []).includes(profissionalId)
      );
    },
    [servicos, profissionalId]
  );

  const servicosOptions = useMemo<SearchableOption[]>(
    () =>
      servicosDoProfissional.map((s) => ({
        value: s.id,
        label: s.nome,
        description: [
          s.eh_combo ? "Combo" : "Servico",
          `${s.duracao_minutos} min`,
          Number(s.preco_padrao ?? s.preco ?? 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          s.combo_resumo || "",
        ]
          .filter(Boolean)
          .join(" • "),
      })),
    [servicosDoProfissional]
  );

  function abrirAviso(
    title: string,
    message: string,
    tone: AvisoState["tone"] = "default"
  ) {
    setAviso({
      open: true,
      title,
      message,
      tone,
    });
  }

  function fecharAviso() {
    setAviso({
      open: false,
      title: "",
      message: "",
      tone: "default",
    });
  }

  useEffect(() => {
    if (!open) return;

    if (mode === "agendamento") {
      if (editingItem) {
        setProfissionalId(editingItem.profissional_id || selectedProfissionalId);
        setClienteId(editingItem.cliente_id || "");
        setServicoId(editingItem.servico_id || "");
        setHoraInicio(normalizeTimeString(editingItem.hora_inicio));
        setObservacoes(editingItem.observacoes || "");
        setStatus((editingItem.status as AgendaStatus) || "confirmado");
        setComandaId(editingItem.id_comanda || "");
        setComandaNumero(editingItem.comanda_numero || null);
      } else {
        setProfissionalId(selectedProfissionalId || "");
        setClienteId("");
        setServicoId("");
        setHoraInicio(normalizeTimeString(selectedTime));
        setObservacoes("");
        setStatus("confirmado");
        setComandaId("");
        setComandaNumero(null);
      }
    }

    if (mode === "bloqueio") {
      if (editingBlock) {
        setProfissionalId(editingBlock.profissional_id || selectedProfissionalId);
        setHoraInicio(normalizeTimeString(editingBlock.hora_inicio));
        setHoraFimBloqueio(normalizeTimeString(editingBlock.hora_fim));
        setMotivoBloqueio(editingBlock.motivo || "");
      } else {
        const start = normalizeTimeString(selectedTime);
        const [hh, mm] = start.split(":").map(Number);
        const endMinutes = hh * 60 + mm + 60;
        const endHour = String(Math.floor(endMinutes / 60)).padStart(2, "0");
        const endMin = String(endMinutes % 60).padStart(2, "0");

        setProfissionalId(selectedProfissionalId || "");
        setHoraInicio(start);
        setHoraFimBloqueio(initialBlockEndTime || `${endHour}:${endMin}`);
        setMotivoBloqueio(initialBlockReason || "");
      }
    }

    setComandasAbertasCliente([]);
    setShowComandaDecisionModal(false);
    setQuickClientOpen(false);
    setQuickClientName("");
    setQuickClientWhatsapp("");
    fecharAviso();
  }, [
    open,
    mode,
    editingItem,
    editingBlock,
    selectedProfissionalId,
    selectedTime,
    initialBlockEndTime,
    initialBlockReason,
  ]);

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setDicaIndex((prev) => (prev + 1) % DICAS_AGENDA.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (mode !== "agendamento" || !profissionalId || !servicoId) return;

    const servicoLiberado = servicosDoProfissional.some((servico) => servico.id === servicoId);
    if (!servicoLiberado) {
      setServicoId("");
    }
  }, [mode, profissionalId, servicoId, servicosDoProfissional]);

  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === servicoId),
    [servicos, servicoId]
  );

  const profissionalSelecionado = useMemo(
    () => profissionais.find((p) => p.id === profissionalId),
    [profissionais, profissionalId]
  );

  const clienteSelecionado = useMemo(
    () => clientes.find((c) => c.id === clienteId),
    [clientes, clienteId]
  );

  const horaFimPreview =
    mode === "agendamento" && servicoSelecionado
      ? addDurationToTime(horaInicio, servicoSelecionado.duracao_minutos)
      : null;

  useEffect(() => {
    if (mode !== "agendamento") return;

    const textoConfirmacao = buildWhatsappConfirmacaoText({
      nomeCliente: clienteSelecionado?.nome || editingItem?.cliente?.nome || "",
      nomeServico: servicoSelecionado?.nome || editingItem?.servico?.nome || "",
      data: editingItem?.data || selectedDate,
      horaInicio: normalizeTimeString(horaInicio),
      horaFim:
        horaFimPreview ||
        editingItem?.hora_fim ||
        normalizeTimeString(horaInicio),
      nomeProfissional: profissionalSelecionado?.nome || "",
    });

    const textoCancelamento = buildWhatsappCancelamentoText({
      nomeCliente: clienteSelecionado?.nome || editingItem?.cliente?.nome || "",
      nomeServico: servicoSelecionado?.nome || editingItem?.servico?.nome || "",
      data: editingItem?.data || selectedDate,
      horaInicio: normalizeTimeString(horaInicio),
      nomeProfissional: profissionalSelecionado?.nome || "",
    });

    if (status === "cancelado") {
      setWhatsMensagem(textoCancelamento);
      return;
    }

    setWhatsMensagem(textoConfirmacao);
  }, [
    mode,
    status,
    clienteSelecionado?.nome,
    editingItem?.cliente?.nome,
    servicoSelecionado?.nome,
    editingItem?.servico?.nome,
    editingItem?.data,
    editingItem?.hora_fim,
    selectedDate,
    horaInicio,
    horaFimPreview,
    profissionalSelecionado?.nome,
  ]);

  function getClienteWhatsapp() {
    const raw =
      clienteSelecionado?.whatsapp ||
      ((editingItem?.cliente as { whatsapp?: string | null } | undefined)?.whatsapp ?? "");

    return String(raw || "").replace(/\D/g, "");
  }

  function abrirWhatsappMensagem() {
    const phone = getClienteWhatsapp();
    const encoded = encodeURIComponent(whatsMensagem);

    if (phone) {
      const numero = phone.startsWith("55") ? phone : `55${phone}`;
      window.open(`https://wa.me/${numero}?text=${encoded}`, "_blank");
      return;
    }

    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }

  function getTituloWhatsapp() {
    if (status === "cancelado") return "WhatsApp cancelamento";
    if (status === "pendente") return "WhatsApp confirmação";
    if (status === "confirmado") return "WhatsApp confirmação";
    return "WhatsApp";
  }

  async function handleClienteChange(novoClienteId: string) {
    setClienteId(novoClienteId);

    if (!novoClienteId) {
      setComandaId("");
      setComandaNumero(null);
      setComandasAbertasCliente([]);
      setShowComandaDecisionModal(false);
      return;
    }

    try {
      setLoadingComanda(true);

      const comandas = await onBuscarComandasAbertas(novoClienteId);

      if (comandas.length > 0) {
        setComandasAbertasCliente(comandas);
        setShowComandaDecisionModal(true);
      } else {
        setComandasAbertasCliente([]);
        setShowComandaDecisionModal(false);
        setComandaId("");
        setComandaNumero(null);
      }
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Erro ao verificar comandas",
        "Não foi possível verificar comandas abertas do cliente.",
        "danger"
      );
    } finally {
      setLoadingComanda(false);
    }
  }

  async function handleAbrirComanda() {
    if (!clienteId) {
      abrirAviso(
        "Cliente obrigatório",
        "Selecione um cliente primeiro.",
        "warning"
      );
      return;
    }

    try {
      setLoadingComanda(true);

      const comandas = await onBuscarComandasAbertas(clienteId);

      if (comandas.length > 0) {
        setComandasAbertasCliente(comandas);
        setShowComandaDecisionModal(true);
        return;
      }

      const nova = await onCriarComanda(clienteId);
      setComandaId(nova.id);
      setComandaNumero(nova.numero);

      abrirAviso(
        "Comanda criada",
        `Comanda #${nova.numero} criada com sucesso.`,
        "success"
      );
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Erro ao abrir comanda",
        "Não foi possível abrir a comanda.",
        "danger"
      );
    } finally {
      setLoadingComanda(false);
    }
  }

  async function handleQuickCreateClient() {
    if (!idSalao) {
      abrirAviso("Salao indisponivel", "Nao foi possivel identificar o salao atual.", "danger");
      return;
    }

    if (!String(quickClientName || "").trim()) {
      abrirAviso("Nome obrigatorio", "Informe pelo menos o nome da cliente.", "warning");
      return;
    }

    try {
      setQuickClientSaving(true);
      const response = await fetch("/api/clientes/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao,
          acao: "salvar",
          cliente: {
            nome: quickClientName.trim(),
            whatsapp: quickClientWhatsapp.trim() || null,
            ativo: true,
          },
        }),
      });

      const data = (await response.json()) as { idCliente?: string; error?: string };

      if (!response.ok || !data.idCliente) {
        throw new Error(data.error || "Nao foi possivel cadastrar a cliente.");
      }

      const novoCliente: Cliente = {
        id: data.idCliente,
        nome: quickClientName.trim(),
        whatsapp: quickClientWhatsapp.trim() || null,
      };

      setQuickClientOptions((prev) => {
        const next = prev.filter((item) => item.id !== novoCliente.id);
        return [...next, novoCliente];
      });
      setClienteId(novoCliente.id);
      setQuickClientOpen(false);
      setQuickClientName("");
      setQuickClientWhatsapp("");

      await handleClienteChange(novoCliente.id);
      abrirAviso("Cliente criado", "Cadastro rapido concluido e cliente selecionado.", "success");
    } catch (error) {
      abrirAviso("Erro ao cadastrar cliente", getErrorMessage(error), "danger");
    } finally {
      setQuickClientSaving(false);
    }
  }

  async function handleCriarNovaComandaParaClienteAtual() {
    if (!clienteId) {
      abrirAviso(
        "Cliente obrigatório",
        "Selecione um cliente primeiro.",
        "warning"
      );
      return;
    }

    try {
      setLoadingComanda(true);
      const nova = await onCriarComanda(clienteId);
      setComandaId(nova.id);
      setComandaNumero(nova.numero);
      setShowComandaDecisionModal(false);

      abrirAviso(
        "Nova comanda criada",
        `Nova comanda #${nova.numero} criada com sucesso.`,
        "success"
      );
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Erro ao criar comanda",
        "Não foi possível criar nova comanda.",
        "danger"
      );
    } finally {
      setLoadingComanda(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;

    if (mode === "agendamento") {
      if (!profissionalId || !clienteId || !servicoId || !horaInicio) {
        abrirAviso(
          "Campos obrigatórios",
          "Preencha profissional, cliente, serviço e hora de início.",
          "warning"
        );
        return;
      }
    }

    if (mode === "bloqueio") {
      if (!profissionalId || !horaInicio || !horaFimBloqueio) {
        abrirAviso(
          "Campos obrigatórios",
          "Preencha profissional, hora de início e hora de fim.",
          "warning"
        );
        return;
      }

      const inicioNormalizado = normalizeTimeString(horaInicio);
      const fimNormalizado = normalizeTimeString(horaFimBloqueio);

      if (fimNormalizado <= inicioNormalizado) {
        abrirAviso(
          "Horário inválido",
          "A hora final do bloqueio deve ser maior que a hora inicial.",
          "warning"
        );
        return;
      }
    }

    try {
      setSaving(true);

      if (mode === "agendamento") {
        await onSave({
          tipo: "agendamento",
          id: editingItem?.id || null,
          profissionalId,
          clienteId,
          servicoId,
          idComanda: comandaId || null,
          data: editingItem?.data || selectedDate,
          horaInicio: normalizeTimeString(horaInicio),
          observacoes,
          status,
        });
      } else {
        await onSave({
          tipo: "bloqueio",
          id: editingBlock?.id || null,
          profissionalId,
          data: editingBlock?.data || selectedDate,
          horaInicio: normalizeTimeString(horaInicio),
          horaFim: normalizeTimeString(horaFimBloqueio),
          motivo: motivoBloqueio,
        });
      }
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Erro ao salvar",
        "Não foi possível salvar. Tente novamente.",
        "danger"
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    loadingComanda,
    profissionalId,
    setProfissionalId,
    clienteId,
    setClienteId,
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
    comandaId,
    setComandaId,
    comandaNumero,
    setComandaNumero,
    showComandaDecisionModal,
    setShowComandaDecisionModal,
    comandasAbertasCliente,
    whatsMensagem,
    setWhatsMensagem,
    aviso,
    fecharAviso,
    dicas: DICAS_AGENDA,
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
  };
}
