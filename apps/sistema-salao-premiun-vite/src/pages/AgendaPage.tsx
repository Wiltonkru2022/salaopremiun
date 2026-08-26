import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  RefreshCw,
  Search,
  Trash2,
  Wallet
} from "lucide-react";
import { Button, Card, EmptyState, Field, Input, Modal, StatusPill, Textarea } from "../components/ui";
import { duration, money, normalizeStatus, shortDate, time } from "../lib/format";
import { database } from "../lib/database";
import type { AppSession, AnyRow } from "../types";

type ViewMode = "day" | "week";
type Profissional = AnyRow & { id: string; nome: string; intervalo_agenda_minutos?: number | null; ativo?: boolean | null };
type Cliente = AnyRow & { id: string; nome: string; whatsapp?: string | null; telefone?: string | null };
type Servico = AnyRow & { id: string; nome: string; preco?: number | null; preco_padrao?: number | null; duracao_minutos?: number | null };
type VinculoServico = { id_profissional: string; id_servico: string; ativo?: boolean | null; duracao_minutos?: number | null; preco_personalizado?: number | null };
type Agendamento = AnyRow & { id: string; data: string; hora_inicio: string; hora_fim: string; status: string; cliente_id?: string | null; profissional_id?: string | null; servico_id?: string | null; id_comanda?: string | null };
type Bloqueio = AnyRow & { id: string; data: string; hora_inicio: string; hora_fim: string; motivo?: string | null; profissional_id?: string | null };

const DEFAULT_CONFIG = { hora_abertura: "08:00", hora_fechamento: "20:00", intervalo_minutos: 30 };
const ACTIVE_STATUSES = ["pendente", "confirmado", "aguardando_pagamento", "reservado_aguardando_pagamento", "aguardando_confirmacao_salao"];

export function AgendaPage({ session }: { session: AppSession }) {
  const idSalao = session.usuario.id_salao;
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [vinculosServicos, setVinculosServicos] = useState<VinculoServico[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [profissionalId, setProfissionalId] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [details, setDetails] = useState<Agendamento | Bloqueio | null>(null);
  const [editing, setEditing] = useState<Agendamento | null>(null);
  const [editingBlock, setEditingBlock] = useState<Bloqueio | null>(null);
  const [form, setForm] = useState({
    clienteId: "",
    profissionalId: "",
    servicoId: "",
    data: date,
    horaInicio: "09:00",
    horaFim: "10:00",
    status: "confirmado",
    observacoes: ""
  });
  const [blockForm, setBlockForm] = useState({
    profissionalId: "",
    data: date,
    horaInicio: "12:00",
    horaFim: "13:00",
    motivo: "Almoço"
  });

  const selectedProfessional = profissionais.find((item) => item.id === profissionalId) || null;
  const interval = Number(selectedProfessional?.intervalo_agenda_minutos || config.intervalo_minutos || 30);
  const weekDates = useMemo(() => buildWeek(date), [date]);
  const visibleDates = viewMode === "day" ? [date] : weekDates;
  const slots = useMemo(() => buildSlots(config.hora_abertura, config.hora_fechamento, interval), [config.hora_abertura, config.hora_fechamento, interval]);

  const filteredAppointments = agendamentos.filter((item) =>
    visibleDates.includes(item.data) && (profissionalId === "todos" || item.profissional_id === profissionalId)
  );
  const filteredBlocks = bloqueios.filter((item) =>
    visibleDates.includes(item.data) && (profissionalId === "todos" || item.profissional_id === profissionalId)
  );

  async function loadAll() {
    setLoading(true);
    setMsg("");
    try {
      const start = viewMode === "day" ? date : visibleDates[0];
      const end = viewMode === "day" ? date : visibleDates[visibleDates.length - 1];
      const [configRes, profRes, clientesRes, servicosRes, vinculosRes, agendaRes, bloqueiosRes] = await Promise.all([
        database.from("configuracoes_salao").select("hora_abertura, hora_fechamento, intervalo_minutos").eq("id_salao", idSalao).maybeSingle(),
        database.from("profissionais").select("id, nome, nome_exibicao, cargo, categoria, ativo, status, intervalo_agenda_minutos, dias_trabalho, cor_agenda").eq("id_salao", idSalao).order("nome"),
        database.from("clientes").select("id, nome, telefone, whatsapp, cashback").eq("id_salao", idSalao).order("nome").limit(1000),
        database.from("servicos").select("id, nome, categoria, preco, preco_padrao, duracao_minutos, ativo, status").eq("id_salao", idSalao).order("nome").limit(1000),
        database.from("profissional_servicos").select("id_profissional, id_servico, ativo, duracao_minutos, preco_personalizado").eq("id_salao", idSalao),
        database
          .from("agendamentos")
          .select("id, id_salao, cliente_id, profissional_id, servico_id, id_comanda, data, hora_inicio, hora_fim, duracao_minutos, observacoes, status, origem, sinal_status, sinal_valor, clientes(nome, telefone, whatsapp, cashback), servicos(nome, preco, preco_padrao, duracao_minutos), profissionais(nome, nome_exibicao)")
          .eq("id_salao", idSalao)
          .gte("data", start)
          .lte("data", end)
          .order("data")
          .order("hora_inicio"),
        database
          .from("agenda_bloqueios")
          .select("id, id_salao, profissional_id, data, hora_inicio, hora_fim, motivo, origem")
          .eq("id_salao", idSalao)
          .gte("data", start)
          .lte("data", end)
          .order("data")
          .order("hora_inicio")
      ]);

      if (configRes.error) throw configRes.error;
      if (profRes.error) throw profRes.error;
      if (clientesRes.error) throw clientesRes.error;
      if (servicosRes.error) throw servicosRes.error;
      if (vinculosRes.error) throw vinculosRes.error;
      if (agendaRes.error) throw agendaRes.error;
      if (bloqueiosRes.error) throw bloqueiosRes.error;

      const nextProfissionais = ((profRes.data || []) as unknown as Profissional[]).filter((item) => item.ativo !== false && String(item.status || "ativo") !== "inativo");
      setConfig({ ...DEFAULT_CONFIG, ...(configRes.data || {}) });
      setProfissionais(nextProfissionais);
      setClientes((clientesRes.data || []) as unknown as Cliente[]);
      setServicos(((servicosRes.data || []) as unknown as Servico[]).filter((item) => item.ativo !== false && String(item.status || "ativo") !== "inativo"));
      setVinculosServicos(((vinculosRes.data || []) as unknown as VinculoServico[]).filter((item) => item.ativo !== false));
      setAgendamentos((agendaRes.data || []) as unknown as Agendamento[]);
      setBloqueios((bloqueiosRes.data || []) as unknown as Bloqueio[]);
      setProfissionalId((current) => current === "todos" || nextProfissionais.some((item) => item.id === current) ? current : "todos");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSalao, date, viewMode]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => void loadAll(), 15_000);
    return () => window.clearInterval(refreshTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSalao, date, viewMode]);

  function openAppointment(slotDate = date, slotTime = "09:00", item?: Agendamento) {
    const appointment = item || null;
    setEditing(appointment);
    const profId = appointment?.profissional_id || (profissionalId !== "todos" ? profissionalId : profissionais[0]?.id || "");
    const servico = servicos.find((svc) => svc.id === appointment?.servico_id);
    setForm({
      clienteId: appointment?.cliente_id || "",
      profissionalId: profId,
      servicoId: appointment?.servico_id || "",
      data: appointment?.data || slotDate,
      horaInicio: time(appointment?.hora_inicio || slotTime),
      horaFim: time(appointment?.hora_fim || addMinutes(slotTime, Number(servico?.duracao_minutos || 60))),
      status: appointment?.status || "confirmado",
      observacoes: String(appointment?.observacoes || "")
    });
    setAppointmentOpen(true);
  }

  function openBlock(slotDate = date, slotTime = "12:00", item?: Bloqueio) {
    setEditingBlock(item || null);
    setBlockForm({
      profissionalId: item?.profissional_id || (profissionalId !== "todos" ? profissionalId : profissionais[0]?.id || ""),
      data: item?.data || slotDate,
      horaInicio: time(item?.hora_inicio || slotTime),
      horaFim: time(item?.hora_fim || addMinutes(slotTime, 60)),
      motivo: String(item?.motivo || "Almoço")
    });
    setBlockOpen(true);
  }

  function serviceOptions() {
    return servicos.filter((servico) => {
      if (!form.profissionalId) return true;
      const linked = vinculosServicos.filter((item) => item.id_servico === servico.id);
      return linked.length === 0 || linked.some((item) => item.id_profissional === form.profissionalId);
    });
  }

  function validateRange(payload: { id?: string; blockId?: string; profissionalId: string; data: string; inicio: string; fim: string }) {
    if (!payload.profissionalId) throw new Error("Escolha o profissional.");
    if (toMinutes(payload.fim) <= toMinutes(payload.inicio)) throw new Error("Hora fim precisa ser maior que início.");
    const activeAppointments = agendamentos.filter((item) =>
      item.id !== payload.id &&
      item.profissional_id === payload.profissionalId &&
      item.data === payload.data &&
      !["cancelado", "faltou", "expirado"].includes(String(item.status)) &&
      overlaps(payload.inicio, payload.fim, item.hora_inicio, item.hora_fim)
    );
    const activeBlocks = bloqueios.filter((item) =>
      item.id !== payload.blockId &&
      item.profissional_id === payload.profissionalId &&
      item.data === payload.data &&
      overlaps(payload.inicio, payload.fim, item.hora_inicio, item.hora_fim)
    );
    if (activeAppointments.length || activeBlocks.length) throw new Error("Esse horário já está ocupado ou bloqueado.");
  }

  async function saveAppointment() {
    try {
      const servico = servicos.find((item) => item.id === form.servicoId);
      if (!form.clienteId || !form.profissionalId || !form.servicoId) throw new Error("Preencha cliente, profissional e serviço.");
      const fim = addMinutes(form.horaInicio, Number(servico?.duracao_minutos || diffMinutes(form.horaInicio, form.horaFim) || 60));
      validateRange({ id: editing?.id, profissionalId: form.profissionalId, data: form.data, inicio: form.horaInicio, fim });
      const payload = {
        id_salao: idSalao,
        cliente_id: form.clienteId,
        profissional_id: form.profissionalId,
        servico_id: form.servicoId,
        data: form.data,
        hora_inicio: form.horaInicio,
        hora_fim: fim,
        duracao_minutos: Number(servico?.duracao_minutos || diffMinutes(form.horaInicio, fim) || 60),
        observacoes: form.observacoes || null,
        status: form.status || "confirmado",
        origem: editing?.origem || "manual",
        updated_at: new Date().toISOString()
      };

      const result = editing
        ? await database.from("agendamentos").update(payload).eq("id", editing.id).eq("id_salao", idSalao)
        : await database.from("agendamentos").insert(payload);
      if (result.error) throw result.error;
      setAppointmentOpen(false);
      setEditing(null);
      await loadAll();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Erro ao salvar agendamento.");
    }
  }

  async function saveBlock() {
    try {
      validateRange({ blockId: editingBlock?.id, profissionalId: blockForm.profissionalId, data: blockForm.data, inicio: blockForm.horaInicio, fim: blockForm.horaFim });
      const payload = {
        id_salao: idSalao,
        profissional_id: blockForm.profissionalId,
        data: blockForm.data,
        hora_inicio: blockForm.horaInicio,
        hora_fim: blockForm.horaFim,
        motivo: blockForm.motivo || null
      };
      const result = editingBlock
        ? await database.from("agenda_bloqueios").update(payload).eq("id", editingBlock.id).eq("id_salao", idSalao)
        : await database.from("agenda_bloqueios").insert(payload);
      if (result.error) throw result.error;
      setBlockOpen(false);
      setEditingBlock(null);
      await loadAll();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Erro ao salvar bloqueio.");
    }
  }

  async function updateStatus(item: Agendamento, status: string) {
    const { error } = await database.from("agendamentos").update({ status, updated_at: new Date().toISOString() }).eq("id", item.id).eq("id_salao", idSalao);
    if (error) setMsg(error.message);
    await loadAll();
  }

  async function deleteAppointment(item: Agendamento) {
    if (String(item.status) === "atendido") {
      setMsg("Agendamento atendido não pode ser excluído.");
      return;
    }
    const { error } = await database.from("agendamentos").delete().eq("id", item.id).eq("id_salao", idSalao);
    if (error) setMsg(error.message);
    await loadAll();
  }

  async function deleteBlock(item: Bloqueio) {
    const { error } = await database.from("agenda_bloqueios").delete().eq("id", item.id).eq("id_salao", idSalao);
    if (error) setMsg(error.message);
    await loadAll();
  }

  async function sendToCashier(item: Agendamento) {
    try {
      if (item.id_comanda) {
        setMsg("Comanda já vinculada. Abra a página Caixa para receber.");
        return;
      }
      const idComanda = await createComandaFromAppointment(idSalao, item, clientes, servicos);
      await database.from("agendamentos").update({ id_comanda: idComanda, status: "aguardando_pagamento", updated_at: new Date().toISOString() }).eq("id", item.id).eq("id_salao", idSalao);
      setMsg("Agendamento enviado para o caixa.");
      await loadAll();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Erro ao enviar para o caixa.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.05em]">Agenda do salão</h2>
            <p className="text-sm font-bold text-zinc-500">Grade criada do zero em Vite, com bloqueios e caixa integrados.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setDate(shiftDate(date, viewMode === "day" ? -1 : -7))}><ChevronLeft size={16} /></Button>
            <Input className="w-auto" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <Button variant="secondary" onClick={() => setDate(shiftDate(date, viewMode === "day" ? 1 : 7))}><ChevronRight size={16} /></Button>
            <Button variant={viewMode === "day" ? "primary" : "secondary"} onClick={() => setViewMode("day")}>Dia</Button>
            <Button variant={viewMode === "week" ? "primary" : "secondary"} onClick={() => setViewMode("week")}>Semana</Button>
            <Button variant="secondary" onClick={() => void loadAll()}><RefreshCw size={16} />Atualizar</Button>
            <Button onClick={() => openAppointment(date, slots[0] || "09:00")}><CalendarPlus size={16} />Agendar</Button>
            <Button variant="secondary" onClick={() => openBlock(date, "12:00")}><Ban size={16} />Bloquear</Button>
          </div>
        </div>
      </Card>

      {msg ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{msg}</div> : null}

      <Card className="p-3">
        <div className="flex gap-2 overflow-auto pb-1 thin-scrollbar">
          <button onClick={() => setProfissionalId("todos")} className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-black ${profissionalId === "todos" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-700"}`}>Todos</button>
          {profissionais.map((item) => (
            <button key={item.id} onClick={() => setProfissionalId(item.id)} className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-black ${profissionalId === item.id ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-700"}`}>
              {String(item.nome_exibicao || item.nome)}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-auto thin-scrollbar">
          <div className={`grid min-w-[780px]`} style={{ gridTemplateColumns: `88px repeat(${visibleDates.length}, minmax(220px, 1fr))` }}>
            <div className="sticky left-0 top-0 z-20 border-b border-r border-zinc-200 bg-white p-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Hora</div>
            {visibleDates.map((day) => (
              <div key={day} className="sticky top-0 z-10 border-b border-r border-zinc-200 bg-white p-3">
                <div className="text-sm font-black text-zinc-950">{dayLabel(day)}</div>
                <div className="text-xs font-bold text-zinc-400">{shortDate(day)}</div>
              </div>
            ))}
            {slots.map((slot) => (
              <AgendaSlotRow
                key={slot}
                slot={slot}
                dates={visibleDates}
                appointments={filteredAppointments}
                blocks={filteredBlocks}
                loading={loading}
                professionals={profissionais}
                onCreate={(slotDate) => openAppointment(slotDate, slot)}
                onBlock={(slotDate) => openBlock(slotDate, slot)}
                onDetails={setDetails}
                onEdit={(item) => openAppointment(item.data, item.hora_inicio, item)}
                onEditBlock={(item) => openBlock(item.data, item.hora_inicio, item)}
                onStatus={updateStatus}
                onDelete={deleteAppointment}
                onDeleteBlock={deleteBlock}
                onCashier={sendToCashier}
              />
            ))}
          </div>
        </div>
        {loading ? <div className="p-4"><EmptyState title="Carregando agenda" message="Atualizando grade e bloqueios." /></div> : null}
      </Card>

      <Modal title={editing ? "Editar agendamento" : "Novo agendamento"} subtitle="Cliente, profissional e serviço com validação de conflito." open={appointmentOpen} onClose={() => setAppointmentOpen(false)}>
        <div className="grid gap-3">
          <SearchSelect label="Cliente" value={form.clienteId} onChange={(value) => setForm((current) => ({ ...current, clienteId: value }))} options={clientes.map((item) => ({ value: item.id, label: item.nome, description: item.whatsapp || item.telefone || "" }))} />
          <SearchSelect label="Profissional" value={form.profissionalId} onChange={(value) => setForm((current) => ({ ...current, profissionalId: value, servicoId: "" }))} options={profissionais.map((item) => ({ value: item.id, label: String(item.nome_exibicao || item.nome), description: String(item.cargo || item.categoria || "") }))} />
          <SearchSelect label="Serviço" value={form.servicoId} onChange={(value) => {
            const svc = servicos.find((item) => item.id === value);
            setForm((current) => ({ ...current, servicoId: value, horaFim: addMinutes(current.horaInicio, Number(svc?.duracao_minutos || 60)) }));
          }} options={serviceOptions().map((item) => ({ value: item.id, label: item.nome, description: `${duration(item.duracao_minutos)} · ${money(item.preco)}` }))} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Data"><Input type="date" value={form.data} onChange={(event) => setForm((current) => ({ ...current, data: event.target.value }))} /></Field>
            <Field label="Início"><Input type="time" value={form.horaInicio} onChange={(event) => setForm((current) => ({ ...current, horaInicio: event.target.value }))} /></Field>
            <Field label="Status"><select className="h-11 rounded-2xl border border-zinc-200 px-3 text-sm font-bold" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{["confirmado", "pendente", "aguardando_pagamento", "atendido"].map((status) => <option key={status}>{status}</option>)}</select></Field>
          </div>
          <Field label="Observações"><Textarea value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))} /></Field>
          <Button onClick={() => void saveAppointment()}>Salvar agendamento</Button>
        </div>
      </Modal>

      <Modal title={editingBlock ? "Editar bloqueio" : "Bloquear horário"} subtitle="Ausência, almoço, curso ou compromisso do profissional." open={blockOpen} onClose={() => setBlockOpen(false)}>
        <div className="grid gap-3">
          <SearchSelect label="Profissional" value={blockForm.profissionalId} onChange={(value) => setBlockForm((current) => ({ ...current, profissionalId: value }))} options={profissionais.map((item) => ({ value: item.id, label: String(item.nome_exibicao || item.nome), description: String(item.cargo || item.categoria || "") }))} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Data"><Input type="date" value={blockForm.data} onChange={(event) => setBlockForm((current) => ({ ...current, data: event.target.value }))} /></Field>
            <Field label="Início"><Input type="time" value={blockForm.horaInicio} onChange={(event) => setBlockForm((current) => ({ ...current, horaInicio: event.target.value }))} /></Field>
            <Field label="Fim"><Input type="time" value={blockForm.horaFim} onChange={(event) => setBlockForm((current) => ({ ...current, horaFim: event.target.value }))} /></Field>
          </div>
          <Field label="Motivo"><Textarea value={blockForm.motivo} onChange={(event) => setBlockForm((current) => ({ ...current, motivo: event.target.value }))} /></Field>
          <Button onClick={() => void saveBlock()}>Salvar bloqueio</Button>
        </div>
      </Modal>

      <Modal title="Detalhes" open={Boolean(details)} onClose={() => setDetails(null)}>
        {details ? <Details item={details} professionals={profissionais} /> : null}
      </Modal>
    </div>
  );
}

function AgendaSlotRow(props: {
  slot: string;
  dates: string[];
  appointments: Agendamento[];
  blocks: Bloqueio[];
  loading: boolean;
  professionals: Profissional[];
  onCreate: (date: string) => void;
  onBlock: (date: string) => void;
  onDetails: (item: Agendamento | Bloqueio) => void;
  onEdit: (item: Agendamento) => void;
  onEditBlock: (item: Bloqueio) => void;
  onStatus: (item: Agendamento, status: string) => void;
  onDelete: (item: Agendamento) => void;
  onDeleteBlock: (item: Bloqueio) => void;
  onCashier: (item: Agendamento) => void;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 border-b border-r border-zinc-100 bg-white p-3 text-xs font-black text-zinc-500">{props.slot}</div>
      {props.dates.map((day) => {
        const apps = props.appointments.filter((item) => item.data === day && time(item.hora_inicio) === props.slot);
        const blocks = props.blocks.filter((item) => item.data === day && time(item.hora_inicio) === props.slot);
        return (
          <div key={`${day}-${props.slot}`} className="min-h-28 border-b border-r border-zinc-100 bg-white p-2">
            <div className="grid gap-2">
              {apps.map((item) => (
                <div key={item.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-zinc-950">{relationName(item.clientes) || "Cliente"}</div>
                      <div className="truncate text-xs font-bold text-zinc-600">{relationName(item.servicos) || "Serviço"}</div>
                      <div className="truncate text-xs font-bold text-zinc-500">{relationName(item.profissionais) || professionalName(props.professionals, item.profissional_id)}</div>
                    </div>
                    <StatusPill status={normalizeStatus(item.status)} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <MiniAction title="Detalhes" onClick={() => props.onDetails(item)} icon={<Clock size={13} />} />
                    {ACTIVE_STATUSES.includes(String(item.status)) ? <MiniAction title="Editar" onClick={() => props.onEdit(item)} icon={<Edit3 size={13} />} /> : null}
                    {item.status === "pendente" ? <MiniAction title="Confirmar" onClick={() => props.onStatus(item, "confirmado")} icon={<CheckCircle2 size={13} />} /> : null}
                    {!item.id_comanda && item.status !== "atendido" ? <MiniAction title="Caixa" onClick={() => props.onCashier(item)} icon={<Wallet size={13} />} /> : null}
                    {item.status !== "atendido" ? <MiniAction title="Excluir" danger onClick={() => props.onDelete(item)} icon={<Trash2 size={13} />} /> : null}
                  </div>
                </div>
              ))}
              {blocks.map((item) => (
                <div key={item.id} className="rounded-2xl border border-zinc-300 bg-zinc-900 p-3 text-white">
                  <div className="text-sm font-black">{item.motivo || "Bloqueado"}</div>
                  <div className="text-xs font-bold text-zinc-300">{professionalName(props.professionals, item.profissional_id)}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <MiniAction title="Editar" onClick={() => props.onEditBlock(item)} icon={<Edit3 size={13} />} />
                    <MiniAction title="Excluir" danger onClick={() => props.onDeleteBlock(item)} icon={<Trash2 size={13} />} />
                  </div>
                </div>
              ))}
              {!apps.length && !blocks.length && !props.loading ? (
                <div className="flex gap-1 opacity-0 transition hover:opacity-100">
                  <MiniAction title="Agendar" onClick={() => props.onCreate(day)} icon={<CalendarPlus size={13} />} />
                  <MiniAction title="Bloquear" onClick={() => props.onBlock(day)} icon={<Ban size={13} />} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}

function SearchSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string; description?: string }> }) {
  const [query, setQuery] = useState("");
  const selected = options.find((item) => item.value === value);
  const filtered = query ? options.filter((item) => `${item.label} ${item.description || ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [];
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
        {selected ? <button className="text-xs font-black text-zinc-500" onClick={() => { onChange(""); setQuery(""); }}>Trocar</button> : null}
      </div>
      {selected ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-sm font-black">{selected.label}</div><div className="text-xs font-bold text-zinc-500">{selected.description}</div></div> : (
        <div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={17} /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Digite para buscar ${label.toLowerCase()}`} /></div>
          {query ? <div className="mt-2 max-h-48 overflow-auto rounded-2xl border border-zinc-200 bg-white thin-scrollbar">
            {filtered.map((item) => <button key={item.value} className="block w-full border-b border-zinc-100 px-3 py-3 text-left last:border-0" onClick={() => { onChange(item.value); setQuery(""); }}><div className="text-sm font-black">{item.label}</div><div className="text-xs font-bold text-zinc-500">{item.description}</div></button>)}
            {!filtered.length ? <div className="px-3 py-4 text-center text-sm font-bold text-zinc-500">Nada encontrado.</div> : null}
          </div> : null}
        </div>
      )}
    </div>
  );
}

function Details({ item, professionals }: { item: Agendamento | Bloqueio; professionals: Profissional[] }) {
  const isBlock = "motivo" in item;
  return (
    <div className="grid gap-3">
      <Info label="Tipo" value={isBlock ? "Bloqueio" : "Agendamento"} />
      <Info label="Data" value={shortDate(item.data)} />
      <Info label="Horário" value={`${time(item.hora_inicio)} - ${time(item.hora_fim)}`} />
      <Info label="Profissional" value={professionalName(professionals, item.profissional_id)} />
      <Info label={isBlock ? "Motivo" : "Cliente"} value={isBlock ? String(item.motivo || "Bloqueio") : relationName((item as Agendamento).clientes) || "Cliente"} />
      {!isBlock ? <Info label="Serviço" value={relationName((item as Agendamento).servicos) || "Serviço"} /> : null}
      <Info label="Observações" value={String((item as AnyRow).observacoes || (item as Bloqueio).motivo || "Sem observações")} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-zinc-50 p-3"><div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{label}</div><div className="mt-1 text-sm font-black text-zinc-950">{value}</div></div>;
}

function MiniAction({ title, icon, onClick, danger }: { title: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button className={`inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-black ${danger ? "bg-red-100 text-red-700" : "bg-white text-zinc-800"}`} onClick={onClick}>{icon}{title}</button>;
}

async function createComandaFromAppointment(idSalao: string, item: Agendamento, clientes: Cliente[], servicos: Servico[]) {
  const rpc = await database.rpc("fn_criar_comanda_por_agendamento", { p_id_agendamento: item.id });
  if (!rpc.error && rpc.data) return String(rpc.data);

  const numero = await nextComandaNumber(idSalao);
  const _cliente = clientes.find((row) => row.id === item.cliente_id);
  const servico = servicos.find((row) => row.id === item.servico_id);
    const total = Number(servico?.preco ?? servico?.preco_padrao ?? 0);
    const { data: comanda, error } = await database.from("comandas").insert({
      id_salao: idSalao,
      numero,
      id_cliente: item.cliente_id || null,
      status: "aberta",
      subtotal: total,
    desconto: 0,
    acrescimo: 0,
    total,
    observacoes: `Criada pela agenda em ${shortDate(item.data)} ${time(item.hora_inicio)}`
  }).select("id").maybeSingle();
  if (error || !comanda?.id) throw error || new Error("Não foi possível criar comanda.");

  if (servico?.id) {
    await database.from("comanda_itens").insert({
      id_salao: idSalao,
      id_comanda: comanda.id,
      tipo_item: "servico",
      id_agendamento: item.id,
      id_servico: servico.id,
      id_profissional: item.profissional_id || null,
      descricao: servico.nome,
      quantidade: 1,
      valor_unitario: total,
      valor_total: total,
      origem: "agenda",
      ativo: true
    });
  }
  return String(comanda.id);
}

async function nextComandaNumber(idSalao: string) {
  const { data } = await database.from("comandas").select("numero").eq("id_salao", idSalao).order("numero", { ascending: false }).limit(1);
  return Number((data?.[0] as AnyRow | undefined)?.numero || 0) + 1;
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return String((value[0] as AnyRow | undefined)?.nome || "");
  return String((value as AnyRow | null)?.nome || "");
}

function professionalName(professionals: Profissional[], id?: string | null) {
  const item = professionals.find((row) => row.id === id);
  return String(item?.nome_exibicao || item?.nome || "Profissional");
}

function buildSlots(start: string, end: string, step: number) {
  const result: string[] = [];
  for (let current = toMinutes(start); current < toMinutes(end); current += Math.max(step, 5)) result.push(fromMinutes(current));
  return result;
}

function buildWeek(date: string) {
  const base = new Date(`${date}T12:00:00`);
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, index) => shiftDate(start.toISOString().slice(0, 10), index));
}

function shiftDate(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(`${date}T12:00:00`));
}

function toMinutes(value: string) {
  const [h, m] = time(value).split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function addMinutes(value: string, minutes: number) {
  return fromMinutes(toMinutes(value) + minutes);
}

function diffMinutes(start: string, end: string) {
  return Math.max(toMinutes(end) - toMinutes(start), 0);
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}
