import {
  Ban,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileImage,
  RefreshCw,
  Trash2
} from "lucide-react";
import { useMemo, useState } from "react";
import { addMinutes, durationLabel, monthLabel, parseISODate, toISODate } from "../../lib/date";
import { database } from "../../lib/database";
import type { Agendamento, Cliente, Profissional, ProfissionalResumo, Servico } from "../../types/database";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, Input } from "../ui/Input";
import { Modal, ModalActionBar } from "../ui/Modal";
import { SearchPicker } from "../ui/SearchPicker";

type CalendarDay = {
  key: string;
  label: string;
  date: string;
  currentMonth: boolean;
  appointments: Agendamento[];
};

const statusClass: Record<string, string> = {
  pendente: "border-yellow-200 bg-yellow-50 text-yellow-800",
  confirmado: "border-emerald-200 bg-emerald-50 text-emerald-800",
  atendido: "border-blue-200 bg-blue-50 text-blue-800",
  em_atendimento: "border-cyan-200 bg-cyan-50 text-cyan-800",
  faltou: "border-red-200 bg-red-50 text-red-700",
  cancelado: "border-red-200 bg-red-50 text-red-700",
  bloqueado: "border-zinc-800 bg-zinc-900 text-white striped"
};

function buildMonthDays(cursor: Date, agendamentos: Agendamento[]): CalendarDay[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: CalendarDay[] = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    cells.push({ key: `start-${i}`, label: "", date: "", currentMonth: false, appointments: [] });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = toISODate(new Date(year, month, day));
    cells.push({
      key: date,
      label: String(day),
      date,
      currentMonth: true,
      appointments: agendamentos.filter((item) => item.data === date)
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `end-${cells.length}`, label: "", date: "", currentMonth: false, appointments: [] });
  }

  return cells;
}

export function Calendar({
  agendamentos,
  clientes,
  servicos,
  profissionais,
  profissionalAtual,
  selectedDate,
  onSelectDate,
  onConfirm,
  onDelete,
  onBlock,
  onConfirmPix,
  onCreate,
  onReschedule
}: {
  agendamentos: Agendamento[];
  clientes: Cliente[];
  servicos: Servico[];
  profissionais: ProfissionalResumo[];
  profissionalAtual: Profissional;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onConfirm: (id: string) => Promise<void>;
  onDelete: (id: string, targetProfissionalId?: string) => Promise<void>;
  onBlock: (datas: string[], horaInicio: string, horaFim: string, titulo?: string, targetProfissionalId?: string) => Promise<void>;
  onConfirmPix?: (id: string) => Promise<void>;
  onCreate?: (payload: { clienteId: string; servicoId: string; data: string; horaInicio: string; profissionalId?: string }) => Promise<void>;
  onReschedule?: (payload: { agendamentoId: string; data: string; horaInicio: string; horaFim: string; status: string }) => Promise<void>;
}) {
  function getHorarioDiaTodo(date: string) {
    const dateObj = parseISODate(date);
    const weekday = dateObj.getDay();
    const selectedProfessional = profissionais.find((item) => item.id === blockProfissional);
    const horarioFuncionamento = selectedProfessional?.horario_funcionamento || profissionalAtual.horario_funcionamento || [];
    const horario = horarioFuncionamento.find((item) => Number(item.dia) === weekday && item.ativo);
    return { inicio: horario?.inicio?.slice(0, 5) || "08:00", fim: horario?.fim?.slice(0, 5) || "18:00" };
  }

  const [cursor, setCursor] = useState(() => {
    const selected = parseISODate(selectedDate);
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const [blockHour, setBlockHour] = useState("12:00");
  const [blockEndHour, setBlockEndHour] = useState("13:00");
  const [blockReason, setBlockReason] = useState("Almoco");
  const [blockSelectedDates, setBlockSelectedDates] = useState<string[]>([selectedDate]);
  const [blockProfissional, setBlockProfissional] = useState("");
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [details, setDetails] = useState<Agendamento | null>(null);
  const [deleteItem, setDeleteItem] = useState<Agendamento | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState<Agendamento | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(selectedDate);
  const [rescheduleHour, setRescheduleHour] = useState("09:00");
  const [newCliente, setNewCliente] = useState("");
  const [newServico, setNewServico] = useState("");
  const [newProfissional, setNewProfissional] = useState("");
  const [newHora, setNewHora] = useState("09:00");
  const [newSubmitting, setNewSubmitting] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);

  const canChooseProfessional = ["todos", "geral", "admin", "administrador"].includes(String(profissionalAtual.nivel_acesso || "").toLowerCase()) && profissionais.length > 1;
  const days = useMemo(() => buildMonthDays(cursor, agendamentos), [cursor, agendamentos]);
  const selectedItems = agendamentos.filter((item) => item.data === selectedDate).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const clienteOptions = clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome, description: cliente.telefone || cliente.whatsapp || "Sem telefone" }));
  const servicosNovoAgendamento = canChooseProfessional ? servicos.filter((servico) => newProfissional && servico.profissional_id === newProfissional) : servicos;
  const servicoOptions = servicosNovoAgendamento.map((servico) => ({ value: servico.id, label: servico.nome, description: durationLabel(Number(servico.duracao_minutos || 0)), meta: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(servico.preco || 0)) }));
  const profissionalOptions = profissionais.map((profissional) => ({ value: profissional.id, label: profissional.nome_exibicao || profissional.nome, description: "Profissional" }));

  function moveMonth(amount: number) { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1)); }
  function toggleBlockDate(date: string) { setBlockSelectedDates((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date].sort()); }
  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id); setActionError(null); setActionSuccess(null);
    try {
      await action();
      setActionSuccess(id.startsWith("pix-") ? "Pix confirmado com sucesso." : id.startsWith("reschedule-") ? "Agendamento reagendado com sucesso." : id.startsWith("delete-block-") ? "Bloqueio excluido com sucesso." : id.startsWith("delete-") ? "Agendamento cancelado com sucesso." : id.startsWith("confirm-") ? "Agendamento confirmado com sucesso." : "Agendamento atualizado com sucesso.");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Não foi possível concluir a ação."); }
    finally { setBusyId(null); }
  }
  function openComprovante(item: Agendamento) {
    if (!item.sinal_comprovante_path) return;
    const { data } = database.storage.from("agendamento-comprovantes").getPublicUrl(item.sinal_comprovante_path);
    window.open(data.publicUrl, "_blank", "noopener,noreferrer");
  }
  function openReschedule(item: Agendamento) {
    setActionError(null); setRescheduleItem(item); setRescheduleDate(item.data || selectedDate); setRescheduleHour(item.hora_inicio.slice(0, 5));
  }

  return (
    <div className="space-y-4">
      {actionError ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{actionError}</div> : null}
      {actionSuccess ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{actionSuccess}</div> : null}

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black tracking-[-0.05em]">{monthLabel(cursor)}</h2>
          <div className="flex gap-2">
            <button className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-white" onClick={() => moveMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={21} /></button>
            <button className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-white" onClick={() => moveMonth(1)} aria-label="Proximo mes"><ChevronRight size={21} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[0.72rem] font-black uppercase text-zinc-400">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {days.map((day) => day.currentMonth ? (
            <button key={day.key} onClick={() => onSelectDate(day.date)} className={`relative aspect-square rounded-2xl border text-sm font-black transition ${selectedDate === day.date ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-800"}`}>
              {day.label}
              {day.appointments.length ? <span className="absolute inset-x-2 bottom-2 flex justify-center gap-0.5">
                {day.appointments.some((item) => item.status === "pendente") ? <span className="h-1 w-2 rounded-full bg-yellow-400" /> : null}
                {day.appointments.some((item) => item.status === "confirmado") ? <span className="h-1 w-2 rounded-full bg-emerald-500" /> : null}
                {day.appointments.some((item) => item.status === "atendido") ? <span className="h-1 w-2 rounded-full bg-blue-500" /> : null}
                {day.appointments.some((item) => item.status === "cancelado" || item.status === "faltou") ? <span className="h-1 w-2 rounded-full bg-red-500" /> : null}
                {day.appointments.some((item) => item.status === "bloqueado") ? <span className="h-1 w-2 rounded-full bg-zinc-700" /> : null}
              </span> : null}
            </button>
          ) : <span key={day.key} />)}
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Linha do tempo</h2>
            <p className="text-sm font-bold text-zinc-500">{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(parseISODate(selectedDate))}</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{selectedItems.length} itens</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => { setNewError(null); setNewOpen(true); }}><CalendarPlus size={16} />Novo agendamento</Button>
          <Button variant="secondary" onClick={() => {
            const selected = parseISODate(selectedDate);
            const selectedIsVisible = selected.getFullYear() === cursor.getFullYear() && selected.getMonth() === cursor.getMonth();
            setBlockSelectedDates(selectedIsVisible ? [selectedDate] : []);
            setBlockProfissional(canChooseProfessional ? "" : profissionalAtual.id);
            setBlockAllDay(false);
            setBlockError(null);
            setBlockOpen(true);
          }}><Ban size={16} />Bloquear horario</Button>
        </div>
        <div className="mt-5 space-y-3">
          {selectedItems.length ? selectedItems.map((item) => {
            const isBlocked = item.status === "bloqueado";
            const canConfirm = item.status === "pendente";
            const canReschedule = item.status === "pendente" || item.status === "confirmado";
            const canRemove = isBlocked || item.status === "pendente" || item.status === "confirmado";
            const hasReceipt = Boolean(item.sinal_comprovante_path);
            const actionCount = 1 + Number(canConfirm) + Number(hasReceipt) + Number(canReschedule) + Number(canRemove);
            const detailsFull = actionCount === 1;
            const removeFull = canRemove && actionCount % 2 === 1;
            return (
              <div key={item.id} className={`rounded-2xl border p-4 ${statusClass[item.status] || statusClass.pendente}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-[0.18em] opacity-70">{item.hora_inicio.slice(0, 5)} - {item.hora_fim.slice(0, 5)}</div>
                    <div className="mt-1 text-lg font-black tracking-[-0.03em]">{isBlocked ? item.titulo || "Horario bloqueado" : item.clientes?.nome || item.titulo || "Cliente"}</div>
                    <div className="text-sm font-bold opacity-75">{isBlocked ? item.observacoes || "Indisponivel" : item.servicos?.nome || "Atendimento"}</div>
                    <div className="mt-2 rounded-full bg-white/60 px-3 py-1 text-xs font-black text-zinc-800">Profissional: {item.profissional_nome || profissionais.find((profissional) => profissional.id === item.profissional_id)?.nome || profissionalAtual.nome_exibicao || profissionalAtual.nome}</div>
                    {!isBlocked && formatCreatedAt(item.agendado_em || item.created_at) ? <div className="mt-2 rounded-xl border border-white/60 bg-white/55 px-3 py-2 text-xs font-bold text-zinc-800"><div>Agendado por <span className="font-black">{item.agendado_por_nome || "Nao identificado"}</span></div><div className="mt-0.5 opacity-75">{bookingSourceLabel(item.origem)} • {formatCreatedAt(item.agendado_em || item.created_at)}</div></div> : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[0.68rem] font-black uppercase text-zinc-900">{item.status.replace("_", " ")}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="secondary" className={`h-11 w-full px-3 ${detailsFull ? "col-span-2" : ""}`} onClick={() => setDetails(item)}><Eye size={16} />Detalhes</Button>
                  {hasReceipt ? <Button variant="secondary" className="h-11 w-full px-3" onClick={() => openComprovante(item)}><FileImage size={16} />Comprovante</Button> : null}
                  {canReschedule ? <Button variant="secondary" className="h-11 w-full px-3" disabled={Boolean(busyId)} onClick={() => openReschedule(item)}><RefreshCw size={16} />Reagendar</Button> : null}
                  {canConfirm ? <Button loading={busyId === `confirm-${item.id}`} className="h-11 w-full px-3" disabled={Boolean(busyId) && busyId !== `confirm-${item.id}`} onClick={() => void run(`confirm-${item.id}`, () => onConfirm(item.id))}><CheckCircle2 size={16} />Confirmar</Button> : null}
                  {canRemove ? <Button variant="danger" className={`h-11 w-full px-3 ${removeFull ? "col-span-2" : ""}`} disabled={Boolean(busyId)} onClick={() => { setActionError(null); setDeleteItem(item); }}><Trash2 size={16} />{isBlocked ? "Excluir bloqueio" : "Cancelar"}</Button> : null}
                </div>
              </div>
            );
          }) : <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">Nenhum horario nesse dia.</div>}
        </div>
      </Card>

      <Modal title={details?.status === "bloqueado" ? "Detalhes do bloqueio" : "Detalhes do agendamento"} subtitle={details?.status === "bloqueado" ? "Informações deste período indisponível." : "Informações principais deste atendimento."} open={Boolean(details)} onClose={() => setDetails(null)}>
        {details ? (
          <div className="space-y-3">
            {actionError ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-700">{actionError}</div> : null}
            {actionSuccess ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-700">{actionSuccess}</div> : null}
            <div className="rounded-[1.3rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
              <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-amber-700">{details.status === "bloqueado" ? "Bloqueio de agenda" : "Atendimento"}</div>
              <div className="mt-2 text-2xl font-black tracking-[-0.05em] text-zinc-950">{details.status === "bloqueado" ? "Horário bloqueado" : details.clientes?.nome || "Cliente"}</div>
              <div className="mt-1 text-sm font-bold text-zinc-500">{details.servicos?.nome || details.observacoes || "Atendimento"}</div>
            </div>
            <Info label="Profissional" value={details.profissional_nome || profissionais.find((item) => item.id === details.profissional_id)?.nome || profissionalAtual.nome} />
            <Info label="Horário" value={`${details.data} · ${details.hora_inicio.slice(0, 5)} às ${details.hora_fim.slice(0, 5)}`} />
            <Info label="Status" value={details.status.replaceAll("_", " ")} />
            {details.status === "bloqueado" ? (
              details.observacoes ? <Info label="Motivo" value={details.observacoes} /> : null
            ) : (
              <>
                <Info label="Agendado por" value={`${details.agendado_por_nome || "Não identificado"} • ${bookingSourceLabel(details.origem)}`} />
                <Info label="Agendado em" value={formatCreatedAt(details.agendado_em || details.created_at) || "Não informado"} />
                <Info label="Confirmação da cliente" value={details.cliente_confirmacao_status === "confirmado" ? `Confirmada${details.cliente_confirmou_em ? ` em ${formatCreatedAt(details.cliente_confirmou_em) || ""}` : ""}` : "Aguardando confirmação da cliente"} />
                {details.observacoes ? <Info label="Observações" value={details.observacoes} /> : null}
                <Info label="Caixa" value={details.id_comanda ? "Comanda vinculada" : "Sem comanda vinculada"} />
                <Info label="Sinal Pix" value={details.sinal_valor ? `${details.sinal_status || "Sem status"} • R$ ${Number(details.sinal_valor).toFixed(2).replace(".", ",")}` : "Sem sinal"} />
                {details.sinal_comprovante_path ? <div className="rounded-[1.15rem] border border-amber-100 bg-amber-50/70 p-4"><div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-amber-700">Comprovante enviado</div><div className="mt-1 break-all text-sm font-bold text-zinc-700">{details.sinal_comprovante_nome || details.sinal_comprovante_path}</div><Button variant="secondary" className="mt-3 h-10 px-3" onClick={() => openComprovante(details)}>Ver comprovante</Button>{String(details.sinal_confirmacao_responsavel || "").toLowerCase() === "profissional" ? <Button className="mt-3 h-10 px-3" loading={busyId === `pix-${details.id}`} disabled={Boolean(busyId) && busyId !== `pix-${details.id}`} onClick={() => void run(`pix-${details.id}`, async () => { await (onConfirmPix?.(details.id) ?? Promise.resolve()); setDetails(null); })}>Confirmar Pix</Button> : <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">A confirmação deste Pix deve ser feita pelo salão.</div>}</div> : null}
              </>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal title={deleteItem?.status === "bloqueado" ? "Excluir bloqueio" : "Cancelar agendamento"} subtitle={deleteItem?.status === "bloqueado" ? "Confirme a exclusao deste horario bloqueado." : "O agendamento ficara com status cancelado e continuara no historico."} open={Boolean(deleteItem)} onClose={() => { if (busyId?.startsWith("delete-")) return; setDeleteItem(null); }}>
        {deleteItem ? <div className="space-y-4"><div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-sm font-black text-zinc-950">{deleteItem.status === "bloqueado" ? deleteItem.observacoes || "Horario bloqueado" : deleteItem.clientes?.nome || "Cliente"}</div><div className="mt-1 text-sm font-bold text-zinc-500">{deleteItem.data} • {deleteItem.hora_inicio.slice(0, 5)} - {deleteItem.hora_fim.slice(0, 5)}</div></div>{actionError ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-700">{actionError}</div> : null}<div className="grid grid-cols-2 gap-2"><Button variant="secondary" disabled={Boolean(busyId)} onClick={() => setDeleteItem(null)}>Voltar</Button><Button variant="danger" loading={busyId === `${deleteItem.status === "bloqueado" ? "delete-block" : "delete"}-${deleteItem.id}`} disabled={Boolean(busyId)} onClick={() => void run(`${deleteItem.status === "bloqueado" ? "delete-block" : "delete"}-${deleteItem.id}`, async () => { await onDelete(deleteItem.id, deleteItem.profissional_id); setDeleteItem(null); })}>{deleteItem.status === "bloqueado" ? "Excluir" : "Cancelar"}</Button></div></div> : null}
      </Modal>

      <Modal title="Novo agendamento" subtitle="Escolha cliente, serviço e horário." open={newOpen} onClose={() => !newSubmitting && setNewOpen(false)}>
        <div className="space-y-4">
          {canChooseProfessional ? <Field label="Profissional"><SearchPicker value={newProfissional} onChange={setNewProfissional} options={profissionalOptions} placeholder="Selecione o profissional" hideInputWhenSelected /></Field> : null}
          <Field label="Cliente"><SearchPicker value={newCliente} onChange={setNewCliente} options={clienteOptions} placeholder="Selecione a cliente" hideInputWhenSelected /></Field>
          <Field label="Serviço"><SearchPicker value={newServico} onChange={setNewServico} options={servicoOptions} placeholder="Selecione o serviço" hideInputWhenSelected /></Field>
          <Field label="Horário"><Input type="time" value={newHora} onChange={(event) => setNewHora(event.target.value)} /></Field>
          {newError ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-700">{newError}</div> : null}
          <ModalActionBar><Button loading={newSubmitting} onClick={async () => { if (!onCreate) return; if (!newCliente || !newServico || !newHora || (canChooseProfessional && !newProfissional)) { setNewError("Preencha todos os campos."); return; } setNewSubmitting(true); setNewError(null); try { await onCreate({ clienteId: newCliente, servicoId: newServico, data: selectedDate, horaInicio: newHora, profissionalId: canChooseProfessional ? newProfissional : profissionalAtual.id }); setNewOpen(false); setNewCliente(""); setNewServico(""); setNewProfissional(""); } catch (error) { setNewError(error instanceof Error ? error.message : "Não foi possível criar o agendamento."); } finally { setNewSubmitting(false); } }}>Salvar agendamento</Button></ModalActionBar>
        </div>
      </Modal>

      <Modal title="Bloquear horário" subtitle="Defina quando este profissional ficará indisponível." open={blockOpen} onClose={() => setBlockOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-[1.2rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-white text-amber-800 shadow-sm ring-1 ring-amber-100"><Ban size={20} /></div>
              <div className="min-w-0">
                <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-amber-700">Bloqueio de agenda</div>
                <div className="mt-1 text-base font-black text-zinc-950">{blockSelectedDates.length} {blockSelectedDates.length === 1 ? "dia selecionado" : "dias selecionados"}</div>
                <div className="mt-0.5 text-xs font-semibold text-zinc-500">{blockAllDay ? "O dia inteiro ficará indisponível." : `${blockHour} às ${blockEndHour}`}</div>
              </div>
            </div>
          </div>

          {canChooseProfessional ? <Field label="Profissional"><SearchPicker value={blockProfissional} onChange={setBlockProfissional} options={profissionalOptions} placeholder="Selecione o profissional" hideInputWhenSelected /></Field> : null}

          <Field label="Motivo"><Input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Ex.: almoço, folga, compromisso" /></Field>

          <button type="button" onClick={() => { const checked = !blockAllDay; setBlockAllDay(checked); if (checked) { const schedule = getHorarioDiaTodo(selectedDate); setBlockHour(schedule.inicio); setBlockEndHour(schedule.fim); } }} className={`flex w-full items-center justify-between rounded-[1.05rem] border px-4 py-3.5 text-left transition ${blockAllDay ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-zinc-50"}`}>
            <div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-[0.85rem] ${blockAllDay ? "bg-amber-100 text-amber-800" : "bg-white text-zinc-600"}`}><CalendarDays size={19} /></div><div><div className="text-sm font-black text-zinc-950">Dia todo</div><div className="mt-0.5 text-xs font-semibold text-zinc-500">Bloquear o expediente completo.</div></div></div>
            <span className={`relative h-7 w-12 rounded-full transition ${blockAllDay ? "bg-amber-500" : "bg-zinc-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${blockAllDay ? "left-6" : "left-1"}`} /></span>
          </button>

          {!blockAllDay ? <div className="rounded-[1.05rem] border border-zinc-200 bg-zinc-50/70 p-3"><div className="mb-3 flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-zinc-400"><Clock3 size={15} /> Período</div><div className="grid grid-cols-2 gap-3"><Field label="Início"><Input type="time" value={blockHour} onChange={(event) => setBlockHour(event.target.value)} /></Field><Field label="Fim"><Input type="time" value={blockEndHour} onChange={(event) => setBlockEndHour(event.target.value)} /></Field></div></div> : null}

          <div className="rounded-[1.1rem] border border-zinc-200 bg-white p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3"><div><div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-400">Dias de</div><div className="mt-0.5 text-lg font-black capitalize tracking-[-0.03em] text-zinc-950">{monthLabel(cursor)}</div></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800">{blockSelectedDates.length} selecionado{blockSelectedDates.length === 1 ? "" : "s"}</span></div>
            <div className="grid grid-cols-7 gap-1 text-center text-[0.62rem] font-black uppercase tracking-wide text-zinc-400">{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}</div>
            <div className="mt-1 grid grid-cols-7 gap-1.5">{days.map((day) => day.currentMonth ? <button key={`block-${day.key}`} type="button" onClick={() => toggleBlockDate(day.date)} className={`aspect-square rounded-[0.8rem] border text-xs font-black transition ${blockSelectedDates.includes(day.date) ? "border-zinc-950 bg-zinc-950 text-white shadow-sm" : "border-zinc-200 bg-white text-zinc-700 active:bg-zinc-50"}`}>{day.label}</button> : <span key={`block-${day.key}`} />)}</div>
          </div>

          {blockError ? <div role="alert" className="rounded-[1rem] border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-700">{blockError}</div> : null}
          <ModalActionBar><Button onClick={async () => { if (!blockSelectedDates.length || (canChooseProfessional && !blockProfissional)) { setBlockError("Selecione pelo menos um dia e o profissional."); return; } const selectedProfessionalId = canChooseProfessional ? blockProfissional : profissionalAtual.id; setBlockError(null); try { await onBlock(blockSelectedDates, blockHour, blockEndHour, blockReason, selectedProfessionalId); setBlockOpen(false); } catch (error) { setBlockError(error instanceof Error ? error.message : "Não foi possível bloquear o horário."); } }}>Bloquear horário</Button></ModalActionBar>
        </div>
      </Modal>

      <Modal title="Reagendar" subtitle="Escolha a nova data e horário." open={Boolean(rescheduleItem)} onClose={() => setRescheduleItem(null)}>
        {rescheduleItem ? <div className="space-y-4"><Field label="Data"><Input type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} /></Field><Field label="Horário"><Input type="time" value={rescheduleHour} onChange={(event) => setRescheduleHour(event.target.value)} /></Field><ModalActionBar><Button loading={busyId === `reschedule-${rescheduleItem.id}`} onClick={() => void run(`reschedule-${rescheduleItem.id}`, async () => { if (!onReschedule) return; const duration = Math.max(1, Math.round((new Date(`1970-01-01T${rescheduleItem.hora_fim}`).getTime() - new Date(`1970-01-01T${rescheduleItem.hora_inicio}`).getTime()) / 60000)); await onReschedule({ agendamentoId: rescheduleItem.id, data: rescheduleDate, horaInicio: rescheduleHour, horaFim: addMinutes(rescheduleHour, duration), status: rescheduleItem.status }); setRescheduleItem(null); })}>Salvar reagendamento</Button></ModalActionBar></div> : null}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.15rem] border border-zinc-100 bg-zinc-50/80 px-4 py-3.5"><div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div><div className="mt-1 text-sm font-black leading-5 text-zinc-900">{value}</div></div>;
}

function formatCreatedAt(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function bookingSourceLabel(value?: string | null) {
  const source = String(value || "").toLowerCase();
  if (source.includes("profissional")) return "App Profissional";
  if (source.includes("cliente")) return "App Cliente";
  if (source.includes("admin") || source.includes("painel")) return "Painel";
  return value || "Não identificado";
}