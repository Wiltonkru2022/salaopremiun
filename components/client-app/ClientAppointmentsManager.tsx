"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Bell, CalendarDays, Clock3, MapPin, MessageCircle, WalletCards, X, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  cancelClienteAppointmentAction,
  confirmClienteAppointmentAction,
  rescheduleClienteAppointmentAction,
  type ClienteAppointmentActionState,
} from "@/app/app-cliente/agendamentos/actions";
import ClientAppointmentReviewForm from "@/components/client-app/ClientAppointmentReviewForm";
import PaginationControls from "@/components/ui/PaginationControls";
import type { ClientAppAppointmentListItem } from "@/lib/client-app/queries";
import { formatClientDuration } from "@/lib/client-app/duration-format";

type AvailabilitySlot = { horaInicio: string; horaFim: string };
type AvailabilityDay = { data: string; rotulo: string; horarios: AvailabilitySlot[] };

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${value}T12:00:00`)).replace(".", "").toUpperCase();
}
function formatDay(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(new Date(`${value}T12:00:00`)); }
function formatStatus(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "reservado_aguardando_pagamento") return "Aguardando sinal";
  if (normalized === "aguardando_confirmacao_salao" || normalized === "aguardando_confirmacao_profissional") return "Comprovante enviado";
  if (normalized === "pendente") return "Pendente";
  if (normalized === "confirmado") return "Confirmada";
  if (normalized === "cancelado") return "Cancelada";
  if (normalized === "atendido") return "Finalizada";
  if (normalized === "faltou") return "Não compareceu";
  return value || "Status";
}
function formatCurrency(value: number | null | undefined) { return value ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value) : null; }
function formatDuration(item: ClientAppAppointmentListItem) {
  const start = item.horaInicio?.split(":").map(Number) || [];
  const end = item.horaFim?.split(":").map(Number) || [];
  if (start.length < 2 || end.length < 2) return "60 min";
  return formatClientDuration(Math.max(0, end[0] * 60 + end[1] - (start[0] * 60 + start[1])));
}
function formatCreatedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
function formatClientConfirmation(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "confirmado") return "Presença confirmada";
  if (normalized === "cancelado") return "Cancelado por você";
  return "Aguardando sua confirmação";
}
function canBookAgain(item: ClientAppAppointmentListItem) { return Boolean(item.idSalao); }
function canConfirmPresence(item: ClientAppAppointmentListItem) { return String(item.status || "").toLowerCase() === "confirmado" && String(item.confirmacaoClienteStatus || "").toLowerCase() !== "confirmado"; }
function needsSignalPayment(item: ClientAppAppointmentListItem) { return String(item.status || "").toLowerCase() === "reservado_aguardando_pagamento" || String(item.sinalStatus || "").toLowerCase() === "aguardando_pagamento"; }
function buildWhatsappLink(item: ClientAppAppointmentListItem) {
  const phone = String(item.salaoWhatsapp || item.salaoTelefone || "").replace(/\D/g, "");
  if (!phone) return null;
  const brPhone = phone.length <= 11 ? `55${phone}` : phone;
  const message = encodeURIComponent(`Olá, ${item.salaoNome}. Quero falar sobre meu agendamento de ${item.servicoNome} no dia ${item.data.split("-").reverse().join("/")} às ${item.horaInicio.slice(0, 5)}.`);
  return `https://wa.me/${brPhone}?text=${message}`;
}
function salonLocation(item: ClientAppAppointmentListItem) {
  const city = [item.salaoCidade, item.salaoEstado].filter(Boolean).join(" - ");
  return [item.salaoEndereco, city].filter(Boolean).join(" · ") || null;
}

function ActionButton({ label, pendingLabel, tone = "dark", icon: Icon, disabled = false }: { label: string; pendingLabel: string; tone?: "dark" | "light" | "danger"; icon?: LucideIcon; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const toneClass = tone === "danger" ? "border border-red-200 bg-red-50 text-red-700" : tone === "light" ? "border border-zinc-200 bg-white text-zinc-950" : "bg-zinc-950 text-white";
  return <button type="submit" disabled={pending || disabled} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition disabled:opacity-60 ${toneClass}`}>{Icon ? <Icon size={19} /> : null}{pending ? pendingLabel : label}</button>;
}

function CancelAppointmentForm({ idAgendamento }: { idAgendamento: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState<ClienteAppointmentActionState, FormData>(cancelClienteAppointmentAction, { error: null });
  if (!confirming) return <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700"><XCircle size={19} />Cancelar</button>;
  return <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:items-center">
    <div role="dialog" aria-modal="true" aria-label="Cancelar agendamento" className="w-full max-w-md rounded-[1.5rem] bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Atenção</div><h3 className="mt-1 text-2xl font-black text-zinc-950">Cancelar agendamento?</h3></div><button type="button" onClick={() => setConfirming(false)} className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100"><X size={20} /></button></div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">O horário será liberado. Se quiser apenas outro horário, prefira reagendar.</p>
      <form action={formAction} className="mt-5 grid grid-cols-2 gap-2"><input type="hidden" name="agendamento" value={idAgendamento} /><button type="button" onClick={() => setConfirming(false)} className="min-h-12 rounded-2xl border border-zinc-200 bg-white text-sm font-black">Voltar</button><ActionButton label="Sim, cancelar" pendingLabel="Cancelando..." tone="danger" /></form>
      {state.error ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</div> : null}
    </div>
  </div>;
}

function ConfirmAppointmentForm({ idAgendamento }: { idAgendamento: string }) {
  const [state, formAction] = useActionState<ClienteAppointmentActionState, FormData>(confirmClienteAppointmentAction, { error: null });
  return <form action={formAction} className="space-y-2"><input type="hidden" name="agendamento" value={idAgendamento} /><ActionButton label="Confirmar presença" pendingLabel="Confirmando..." />{state.error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</div> : null}</form>;
}

function RescheduleAppointmentForm({ item }: { item: ClientAppAppointmentListItem }) {
  const [state, formAction] = useActionState<ClienteAppointmentActionState, FormData>(rescheduleClienteAppointmentAction, { error: null });
  const [open, setOpen] = useState(false);
  const [dias, setDias] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const horarios = useMemo(() => dias.find((dia) => dia.data === selectedDate)?.horarios || [], [dias, selectedDate]);
  async function loadAvailability() {
    setOpen(true); if (dias.length || loading) return;
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams({ salao: item.idSalao, servico: item.idServico, profissional: item.idProfissional, ignorar: item.id });
      const response = await fetch(`/api/app-cliente/disponibilidade?${params.toString()}`, { method: "GET", credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Não foi possível carregar horários.");
      const nextDias = Array.isArray(payload.dias) ? payload.dias as AvailabilityDay[] : [];
      setDias(nextDias); setSelectedDate(nextDias[0]?.data || ""); setSelectedTime(nextDias[0]?.horarios[0]?.horaInicio || "");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar horários."); }
    finally { setLoading(false); }
  }
  return <div className="space-y-3"><button type="button" onClick={() => void loadAvailability()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950"><CalendarDays size={19} />Reagendar</button>
    {open ? <form action={formAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><input type="hidden" name="agendamento" value={item.id} /><input type="hidden" name="data" value={selectedDate} /><input type="hidden" name="hora_inicio" value={selectedTime} />
      {loading ? <div className="text-sm text-zinc-500">Buscando horários livres...</div> : error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : dias.length ? <><div><p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Escolha o dia</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{dias.map((dia) => <button key={dia.data} type="button" onClick={() => { setSelectedDate(dia.data); setSelectedTime(dia.horarios[0]?.horaInicio || ""); }} className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-black ${selectedDate === dia.data ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}>{dia.rotulo}</button>)}</div></div><div><p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Escolha o horário</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{horarios.map((horario) => <button key={`${selectedDate}-${horario.horaInicio}`} type="button" onClick={() => setSelectedTime(horario.horaInicio)} className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-black ${selectedTime === horario.horaInicio ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}>{horario.horaInicio.slice(0, 5)}</button>)}</div></div><ActionButton label="Confirmar reagendamento" pendingLabel="Reagendando..." disabled={!selectedDate || !selectedTime} /></> : <div className="text-sm text-zinc-500">Sem horários livres para esse atendimento.</div>}
      {state.error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</div> : null}</form> : null}</div>;
}

export default function ClientAppointmentsManager({ agendamentos, successKey, currentPage = 0, hasMore = false }: { agendamentos: ClientAppAppointmentListItem[]; successKey?: string | null; currentPage?: number; hasMore?: boolean }) {
  const successMessage = useMemo(() => {
    if (successKey === "agendado") return "Seu pedido foi enviado. O salão vai confirmar o horário.";
    if (successKey === "cancelado") return "Seu agendamento foi cancelado e o horário foi liberado.";
    if (successKey === "confirmado") return "Sua presença foi confirmada para o salão.";
    if (successKey === "comprovante_enviado") return "Comprovante enviado. Seu agendamento está em conferência.";
    if (successKey === "reagendado") return "Seu agendamento foi reagendado.";
    if (successKey === "avaliado") return "Sua avaliação foi enviada.";
    return null;
  }, [successKey]);

  return <section className="space-y-5">
    {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{successMessage}</div> : null}
    <div className="space-y-4">
      {agendamentos.length ? agendamentos.map((item) => {
        const location = salonLocation(item);
        const whatsapp = buildWhatsappLink(item);
        return <article key={item.id} className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.07)]">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-black text-zinc-700"><Bell size={14} />{formatStatus(item.status)}</span>{needsSignalPayment(item) && item.sinalValor ? <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800">Sinal {formatCurrency(item.sinalValor)}</span> : null}</div><h2 className="mt-3 break-words text-xl font-black tracking-[-0.035em] text-zinc-950">{item.servicoNome}</h2><p className="mt-1 text-sm font-semibold text-zinc-500">{item.salaoNome} · {item.profissionalNome}</p></div><div className="shrink-0 rounded-2xl bg-zinc-950 px-3 py-2 text-center text-white"><div className="text-[10px] font-black tracking-wider text-amber-300">{formatMonth(item.data)}</div><div className="text-2xl font-black">{formatDay(item.data)}</div><div className="text-xs font-bold">{item.horaInicio.slice(0,5)}</div></div></div>
            <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">{location ? <div className="flex items-start gap-2"><MapPin size={17} className="mt-0.5 shrink-0" /><span>{location}</span></div> : null}<div className="flex items-center gap-2"><Clock3 size={17} /><span>{formatDuration(item)}</span></div>{formatCreatedAt(item.criadoEm) ? <div className="flex items-center gap-2 text-xs text-zinc-400 sm:col-span-2"><CalendarDays size={15} />Solicitado em {formatCreatedAt(item.criadoEm)}</div> : null}</div>
            {item.podeCancelar ? <div className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-600">{String(item.status || "").toLowerCase() === "pendente" ? "Aguardando confirmação do salão" : formatClientConfirmation(item.confirmacaoClienteStatus)}</div> : null}
          </div>
          <div className="border-t border-zinc-100 bg-zinc-50/60 p-3 sm:p-4"><div className="flex flex-wrap gap-2">{needsSignalPayment(item) ? <Link href={`/app-cliente/agendamentos/${item.id}/sinal`} className="inline-flex min-h-12 items-center rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white">Pagar sinal</Link> : null}{canConfirmPresence(item) ? <ConfirmAppointmentForm idAgendamento={item.id} /> : null}{item.podeCancelar ? <><RescheduleAppointmentForm item={item} /><CancelAppointmentForm idAgendamento={item.id} /></> : null}{canBookAgain(item) && !item.podeCancelar ? <Link href={`/app-cliente/salao/${item.idSalao}`} className="inline-flex min-h-12 items-center rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white">Reservar novamente</Link> : null}{whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700"><MessageCircle size={18} />WhatsApp</a> : null}{item.podeAvaliar ? <Link href={`/app-cliente/agendamentos/${item.id}/avaliar`} className="inline-flex min-h-12 items-center rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white">Avaliar</Link> : null}</div>{item.podeAvaliar ? <div className="mt-3"><ClientAppointmentReviewForm idAgendamento={item.id} compact /></div> : null}{item.avaliado ? <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Avaliação enviada.</div> : null}</div>
        </article>;
      }) : <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 p-7 text-center"><CalendarDays size={42} className="mx-auto text-zinc-400" /><h2 className="mt-4 text-xl font-black text-zinc-950">Nenhum agendamento ainda</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Explore os salões e reserve seu próximo horário.</p><Link href="/app-cliente/explorar" className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white">Encontrar um salão</Link></div>}
    </div>
    {hasMore || currentPage > 0 ? <div className="rounded-[1.4rem] border border-dashed border-zinc-300 bg-white px-4 py-3"><PaginationControls currentPage={currentPage} pageSize={10} hasMore={hasMore} buildHref={(page) => `/app-cliente/agendamentos?pagina=${page + 1}`} /></div> : null}
  </section>;
}
