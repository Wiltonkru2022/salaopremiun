import {
  Ban,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileImage,
  RefreshCw,
  Trash2
} from "lucide-react";
import { useMemo, useState } from "react";
import { addMinutes, durationLabel, monthLabel, parseISODate, toISODate } from "../../lib/date";
import { supabase } from "../../lib/supabase";
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
  onBlock: (datas: string[], horaInicio: string, duracaoMinutos: number, titulo?: string, targetProfissionalId?: string) => Promise<void>;
  onConfirmPix?: (id: string) => Promise<void>;
  onCreate?: (payload: { clienteId: string; servicoId: string; data: string; horaInicio: string; profissionalId?: string }) => Promise<void>;
  onReschedule?: (payload: { agendamentoId: string; data: string; horaInicio: string; horaFim: string; status: string }) => Promise<void>;
}) {
  function getHorarioDiaTodo(date: string) {
    const dateObj = parseISODate(date);
    const weekday = dateObj.getDay();
    const horario = (profissionalAtual.horario_funcionamento || []).find(
      (item) => Number(item.dia) === weekday && item.ativo
    );

    return {
      inicio: horario?.inicio?.slice(0, 5) || "08:00",
      fim: horario?.fim?.slice(0, 5) || "18:00"
    };
  }

  const [cursor, setCursor] = useState(() => {
    const selected = parseISODate(selectedDate);
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const [blockHour, setBlockHour] = useState("12:00");
  const [blockDuration, setBlockDuration] = useState(60);
  const [blockReason, setBlockReason] = useState("Almoco");
  const [blockSelectedDates, setBlockSelectedDates] = useState<string[]>([selectedDate]);
  const [blockProfissional, setBlockProfissional] = useState("");
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [details, setDetails] = useState<Agendamento | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState<Agendamento | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(selectedDate);
  const [rescheduleHour, setRescheduleHour] = useState("09:00");
  const [newCliente, setNewCliente] = useState("");
  const [newServico, setNewServico] = useState("");
  const [newProfissional, setNewProfissional] = useState("");
  const [newHora, setNewHora] = useState("09:00");

  const canChooseProfessional = ["todos", "geral", "admin", "administrador"].includes(String(profissionalAtual.nivel_acesso || "").toLowerCase()) && profissionais.length > 1;
  const days = useMemo(() => buildMonthDays(cursor, agendamentos), [cursor, agendamentos]);
  const selectedMonthDates = useMemo(
    () => days.filter((day) => day.currentMonth && day.date).map((day) => day.date),
    [days]
  );
  const selectedItems = agendamentos
    .filter((item) => item.data === selectedDate)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const clienteOptions = clientes.map((cliente) => ({
    value: cliente.id,
    label: cliente.nome,
    description: cliente.telefone || cliente.whatsapp || "Sem telefone"
  }));
  const servicosNovoAgendamento = canChooseProfessional
    ? servicos.filter((servico) => newProfissional && servico.profissional_id === newProfissional)
    : servicos;
  const servicoOptions = servicosNovoAgendamento.map((servico) => ({
    value: servico.id,
    label: servico.nome,
    description: durationLabel(Number(servico.duracao_minutos || 0)),
    meta: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(servico.preco || 0))
  }));
  const profissionalOptions = profissionais.map((profissional) => ({
    value: profissional.id,
    label: profissional.nome_exibicao || profissional.nome,
    description: "Profissional"
  }));

  function moveMonth(amount: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1));
  }

  function toggleBlockDate(date: string) {
    setBlockSelectedDates((current) =>
      current.includes(date)
        ? current.filter((item) => item !== date)
        : [...current, date].sort()
    );
  }

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  }

  function openComprovante(item: Agendamento) {
    if (!item.sinal_comprovante_path) return;
    const { data } = supabase.storage
      .from("agendamento-comprovantes")
      .getPublicUrl(item.sinal_comprovante_path);
    window.open(data.publicUrl, "_blank", "noopener,noreferrer");
  }

  function openReschedule(item: Agendamento) {
    setRescheduleItem(item);
    setRescheduleDate(item.data || selectedDate);
    setRescheduleHour(item.hora_inicio.slice(0, 5));
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black tracking-[-0.05em]">{monthLabel(cursor)}</h2>
          <div className="flex gap-2">
            <button className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-white" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
              <ChevronLeft size={21} />
            </button>
            <button className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-white" onClick={() => moveMonth(1)} aria-label="Proximo mes">
              <ChevronRight size={21} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[0.72rem] font-black uppercase text-zinc-400">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => <span key={day}>{day}</span>)}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {days.map((day) => day.currentMonth ? (
            <button
              key={day.key}
              onClick={() => onSelectDate(day.date)}
              className={`relative aspect-square rounded-2xl border text-sm font-black transition ${selectedDate === day.date ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-800"}`}
            >
              {day.label}
              {day.appointments.length ? (
                <span className="absolute inset-x-2 bottom-2 flex justify-center gap-0.5">
                  {day.appointments.some((item) => item.status === "pendente") ? <span className="h-1 w-2 rounded-full bg-yellow-400" /> : null}
                  {day.appointments.some((item) => item.status === "confirmado") ? <span className="h-1 w-2 rounded-full bg-emerald-500" /> : null}
                  {day.appointments.some((item) => item.status === "atendido") ? <span className="h-1 w-2 rounded-full bg-blue-500" /> : null}
                  {day.appointments.some((item) => item.status === "cancelado" || item.status === "faltou") ? <span className="h-1 w-2 rounded-full bg-red-500" /> : null}
                  {day.appointments.some((item) => item.status === "bloqueado") ? <span className="h-1 w-2 rounded-full bg-zinc-700" /> : null}
                </span>
              ) : null}
            </button>
          ) : <span key={day.key} />)}
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Linha do tempo</h2>
            <p className="text-sm font-bold text-zinc-500">
              {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(parseISODate(selectedDate))}
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{selectedItems.length} itens</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => setNewOpen(true)}>
            <CalendarPlus size={16} />
            Novo agendamento
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setBlockSelectedDates([selectedDate]);
              setBlockProfissional(canChooseProfessional ? "" : profissionalAtual.id);
              setBlockAllDay(false);
              setBlockOpen(true);
            }}
          >
            <Ban size={16} />
            Bloquear horario
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {selectedItems.length ? selectedItems.map((item) => (
            <div key={item.id} className={`rounded-2xl border p-4 ${statusClass[item.status] || statusClass.pendente}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
                    {item.hora_inicio.slice(0, 5)} - {item.hora_fim.slice(0, 5)}
                  </div>
                  <div className="mt-1 text-lg font-black tracking-[-0.03em]">
                    {item.status === "bloqueado" ? item.titulo || "Horario bloqueado" : item.clientes?.nome || item.titulo || "Cliente"}
                  </div>
                  <div className="text-sm font-bold opacity-75">{item.status === "bloqueado" ? item.observacoes || "Indisponivel" : item.servicos?.nome || "Atendimento"}</div>
                  <div className="mt-2 rounded-full bg-white/60 px-3 py-1 text-xs font-black text-zinc-800">
                    Profissional: {item.profissional_nome || profissionais.find((profissional) => profissional.id === item.profissional_id)?.nome || profissionalAtual.nome_exibicao || profissionalAtual.nome}
                  </div>
                </div>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[0.68rem] font-black uppercase text-zinc-900">{item.status.replace("_", " ")}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" className="h-9 px-3" onClick={() => setDetails(item)}>
                  <Eye size={15} />
                  Detalhes
                </Button>
                {item.status === "pendente" ? (
                  <Button loading={busyId === `confirm-${item.id}`} variant="secondary" className="h-9 px-3" onClick={() => run(`confirm-${item.id}`, () => onConfirm(item.id))}>
                    <CheckCircle2 size={15} />
                    Confirmar
                  </Button>
                ) : null}
                {item.sinal_comprovante_path ? (
                  <Button variant="secondary" className="h-9 px-3" onClick={() => openComprovante(item)}>
                    <FileImage size={15} />
                    Ver comprovante
                  </Button>
                ) : null}
                {(item.status === "pendente" || item.status === "confirmado") ? (
                  <Button variant="secondary" className="h-9 px-3" onClick={() => openReschedule(item)}>
                    <RefreshCw size={15} />
                    Reagendar
                  </Button>
                ) : null}
                {item.status !== "atendido" ? (
                  <Button loading={busyId === `delete-${item.id}`} variant="danger" className="h-9 px-3" onClick={() => run(`delete-${item.id}`, () => onDelete(item.id, item.profissional_id || undefined))}>
                    <Trash2 size={15} />
                    Excluir
                  </Button>
                ) : null}
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">Nenhum horario nesse dia.</div>
          )}
        </div>
      </Card>

      <Modal title="Detalhes do agendamento" subtitle="Revise cliente, servico, caixa e sinal Pix." open={Boolean(details)} onClose={() => setDetails(null)}>
        {details ? (
          <div className="space-y-3">
            <Info label="Cliente" value={details.status === "bloqueado" ? "Horario bloqueado" : details.clientes?.nome || "Cliente"} />
            <Info label="Servico" value={details.servicos?.nome || details.observacoes || "Atendimento"} />
            <Info label="Profissional" value={details.profissional_nome || profissionais.find((item) => item.id === details.profissional_id)?.nome || profissionalAtual.nome} />
            <Info label="Horario" value={`${details.data} das ${details.hora_inicio} as ${details.hora_fim}`} />
            <Info label="Status" value={details.status.replace("_", " ")} />
            <Info label="Observacoes" value={details.observacoes || "Sem observacoes"} />
            <Info label="Caixa" value={details.id_comanda ? "Ja passou pelo caixa" : "Sem comanda vinculada"} />
            <Info label="Sinal Pix" value={details.sinal_valor ? `${details.sinal_status || "sem status"} - R$ ${Number(details.sinal_valor).toFixed(2)}` : "Sem sinal"} />
            {details.sinal_comprovante_path ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Comprovante enviado</div>
                <div className="mt-1 break-all text-sm font-bold text-zinc-700">{details.sinal_comprovante_nome || details.sinal_comprovante_path}</div>
                <Button variant="secondary" className="mt-3 h-10 px-3" onClick={() => openComprovante(details)}>Ver comprovante</Button>
                <Button className="mt-3 h-10 px-3" onClick={() => run(`pix-${details.id}`, () => onConfirmPix?.(details.id) ?? Promise.resolve())}>Confirmar Pix</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal title="Novo agendamento" subtitle="Preencha os campos e confirme o horario." open={newOpen} onClose={() => setNewOpen(false)}>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newCliente || !newServico || (canChooseProfessional && !newProfissional)) return;
            await onCreate?.({ clienteId: newCliente, servicoId: newServico, data: selectedDate, horaInicio: newHora, profissionalId: canChooseProfessional ? newProfissional : profissionalAtual.id });
            setNewOpen(false);
            setNewCliente("");
            setNewServico("");
            setNewProfissional("");
          }}
        >
          {canChooseProfessional ? (
            <SearchPicker hideInputWhenSelected label="Profissional" placeholder="Digite o nome" options={profissionalOptions} value={newProfissional} onChange={(value) => { setNewProfissional(value); setNewServico(""); }} emptyText="Nenhum profissional encontrado." />
          ) : null}
          <SearchPicker hideInputWhenSelected label="Cliente" placeholder="Digite nome ou telefone" options={clienteOptions} value={newCliente} onChange={setNewCliente} />
          <SearchPicker hideInputWhenSelected label="Servico" placeholder={canChooseProfessional && !newProfissional ? "Escolha o profissional primeiro" : "Digite o servico"} options={servicoOptions} value={newServico} onChange={setNewServico} emptyText={canChooseProfessional && !newProfissional ? "Escolha um profissional antes." : "Servico nao encontrado para esse profissional."} />
          <Field label="Horario"><Input type="time" value={newHora} onChange={(event) => setNewHora(event.target.value)} /></Field>
          <ModalActionBar>
            <Button>Criar agendamento</Button>
          </ModalActionBar>
        </form>
      </Modal>

      <Modal title="Bloquear horario" subtitle="Selecione varias datas do mes e aplique o mesmo bloqueio." open={blockOpen} onClose={() => { setBlockAllDay(false); setBlockOpen(false); }}>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!blockSelectedDates.length || (canChooseProfessional && !blockProfissional)) return;
            const horarioDiaTodo = getHorarioDiaTodo(blockSelectedDates[0] || selectedDate);
            const horaInicioBloqueio = blockAllDay ? horarioDiaTodo.inicio : blockHour;
            const duracaoBloqueio = blockAllDay
              ? Math.max(
                  5,
                  Math.round(
                    (new Date(`2000-01-01T${horarioDiaTodo.fim}`).getTime() -
                      new Date(`2000-01-01T${horarioDiaTodo.inicio}`).getTime()) / 60000
                  )
                )
              : blockDuration;
            await onBlock(
              blockSelectedDates,
              horaInicioBloqueio,
              duracaoBloqueio,
              blockReason || "Bloqueio",
              canChooseProfessional ? blockProfissional : profissionalAtual.id
            );
            setBlockAllDay(false);
            setBlockOpen(false);
          }}
        >
          {canChooseProfessional ? (
            <SearchPicker
              hideInputWhenSelected
              label="Profissional"
              placeholder="Digite o nome"
              options={profissionalOptions}
              value={blockProfissional}
              onChange={setBlockProfissional}
              emptyText="Nenhum profissional encontrado."
            />
          ) : null}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-black text-zinc-900">Datas do bloqueio</div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-600">
                {blockSelectedDates.length} dia(s)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {selectedMonthDates.map((date) => {
                const parsed = parseISODate(date);
                const active = blockSelectedDates.includes(date);

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => toggleBlockDate(date)}
                    className={`rounded-2xl border p-2 text-left transition ${
                      active
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-800"
                    }`}
                  >
                    <div
                      className={`text-[0.65rem] font-black uppercase ${
                        active ? "text-zinc-300" : "text-zinc-400"
                      }`}
                    >
                      {new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
                        .format(parsed)
                        .replace(".", "")}
                    </div>
                    <div className="mt-1 text-lg font-black leading-none">
                      {parsed.getDate()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-black text-zinc-800">
            <input
              type="checkbox"
              checked={blockAllDay}
              onChange={(event) => setBlockAllDay(event.target.checked)}
            />
            Bloquear dia todo
          </label>
          {blockAllDay ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
              Usa o expediente configurado do profissional para a data selecionada.
            </div>
          ) : null}
          <Field label="Horario"><Input type="time" value={blockHour} onChange={(event) => setBlockHour(event.target.value)} disabled={blockAllDay} /></Field>
          <Field label="Tempo"><Input type="number" min={5} step={5} value={blockDuration} onChange={(event) => setBlockDuration(Number(event.target.value))} disabled={blockAllDay} /></Field>
          <Field label="Observacao"><Input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Ex.: almoco, curso, compromisso" /></Field>
          <ModalActionBar>
            <Button>Bloquear</Button>
          </ModalActionBar>
        </form>
      </Modal>

      <Modal title="Reagendar" subtitle="Altere data e horario mantendo o cliente e servico." open={Boolean(rescheduleItem)} onClose={() => setRescheduleItem(null)}>
        {rescheduleItem ? (
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const duracao = Number(rescheduleItem.servicos?.duracao_minutos || 0) || Math.max(5, Math.round((new Date(`2000-01-01T${rescheduleItem.hora_fim}`).getTime() - new Date(`2000-01-01T${rescheduleItem.hora_inicio}`).getTime()) / 60000)) || 60;
              await onReschedule?.({
                agendamentoId: rescheduleItem.id,
                data: rescheduleDate,
                horaInicio: rescheduleHour,
                horaFim: addMinutes(rescheduleHour, duracao),
                status: rescheduleItem.status
              });
              setRescheduleItem(null);
            }}
          >
            <Info label="Cliente" value={rescheduleItem.clientes?.nome || rescheduleItem.titulo || "Cliente"} />
            <Info label="Servico" value={rescheduleItem.servicos?.nome || "Atendimento"} />
            <Field label="Data"><Input type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} /></Field>
            <Field label="Horario"><Input type="time" value={rescheduleHour} onChange={(event) => setRescheduleHour(event.target.value)} /></Field>
            <ModalActionBar>
              <Button>Salvar reagendamento</Button>
            </ModalActionBar>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-3">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-black text-zinc-900">{value}</div>
    </div>
  );
}
