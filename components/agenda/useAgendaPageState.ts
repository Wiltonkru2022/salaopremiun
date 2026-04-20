"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { ComandaResumo } from "@/components/agenda/page-types";
import type {
  Agendamento,
  AgendaDensityMode,
  Bloqueio,
  Cliente,
  ConfigSalao,
  Profissional,
  Servico,
  ViewMode,
} from "@/types/agenda";

export function useAgendaPageState() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [erroTela, setErroTela] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [idSalao, setIdSalao] = useState("");
  const [agendaExpanded, setAgendaExpanded] = useState(false);
  const [densityMode, setDensityMode] =
    useState<AgendaDensityMode>("reception");

  const [permissoes, setPermissoes] = useState<Record<string, boolean> | null>(
    null
  );
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const [config, setConfig] = useState<ConfigSalao | null>(null);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);

  const [selectedProfissionalId, setSelectedProfissionalId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"agendamento" | "bloqueio">(
    "agendamento"
  );
  const [editingItem, setEditingItem] = useState<Agendamento | null>(null);
  const [editingBlock, setEditingBlock] = useState<Bloqueio | null>(null);

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedTime, setSelectedTime] = useState("08:00");

  const [assinaturaBloqueada, setAssinaturaBloqueada] = useState(false);

  const [comandasAbertasCliente, setComandasAbertasCliente] = useState<
    ComandaResumo[]
  >([]);

  const selectedProfissional = useMemo(
    () => profissionais.find((p) => p.id === selectedProfissionalId),
    [profissionais, selectedProfissionalId]
  );

  const totalAtendimentos = useMemo(() => agendamentos.length, [agendamentos]);
  const aguardandoPagamento = useMemo(
    () =>
      agendamentos.filter((item) => item.status === "aguardando_pagamento")
        .length,
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

  return {
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
    comandasAbertasCliente,
    setComandasAbertasCliente,
    selectedProfissional,
    totalAtendimentos,
    aguardandoPagamento,
    totalBloqueios,
    valorPotencial,
  };
}
