import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, Eye, Scissors, Users } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { money } from "../lib/date";
import type { Agendamento, Cliente, Comanda, Servico } from "../types/database";

function firstName(value: string) {
  return String(value || "").trim().split(/\s+/)[0] || "Profissional";
}

function greetingForHour(hour: number) {
  if (hour >= 0 && hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function dateLabel(date: Date) {
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(date);
  return { weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), dayMonth };
}

function bookingSourceLabel(value?: string | null) {
  const source = String(value || "").toLowerCase();
  if (source.includes("profissional")) return "App Profissional";
  if (source.includes("cliente")) return "App Cliente";
  if (source.includes("admin") || source.includes("painel")) return "Painel";
  return value || "Não identificado";
}

function formatCreatedAt(value?: string | null) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function durationText(item: Agendamento) {
  const start = item.hora_inicio?.slice(0, 5);
  const end = item.hora_fim?.slice(0, 5);
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = Math.max(0, eh * 60 + em - (sh * 60 + sm));
  if (!minutes) return "";
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
  return `${minutes}min`;
}

export function InicioPage({ nome, agendamentos, clientes, servicos, comandas, goTo }: {
  nome: string;
  agendamentos: Agendamento[];
  clientes: Cliente[];
  servicos: Servico[];
  comandas: Comanda[];
  goTo: (view: "agenda" | "clientes" | "servicos" | "comandas") => void;
}) {
  const [details, setDetails] = useState<Agendamento | null>(null);
  const now = new Date();
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).format(now);
  const nomeCurto = firstName(nome);
  const saudacao = greetingForHour(now.getHours());
  const dataAtual = dateLabel(now);

  const hojeItens = useMemo(() => agendamentos.filter((item) => item.data === hoje && item.status !== "cancelado"), [agendamentos, hoje]);
  const concluidos = hojeItens.filter((item) => item.status === "atendido").length;
  const previsto = hojeItens.reduce((acc, item) => acc + Number(item.servicos?.preco || 0), 0);
  const proximo = hojeItens.filter((item) => !["atendido", "faltou", "bloqueado"].includes(item.status)).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];

  return (
    <div className="space-y-4 pb-6">
      <section className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-1 pt-1">
        <div className="min-w-0">
          <h2 className="text-[1.85rem] font-black leading-[1.02] tracking-[-0.055em] text-zinc-950">{saudacao}, {nomeCurto}!</h2>
          <p className="mt-2 text-[0.98rem] font-bold text-zinc-500">Veja como está seu dia.</p>
        </div>
        <div className="shrink-0 rounded-[1rem] border border-zinc-200 bg-white px-3 py-2.5 text-right shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
          <div className="text-[0.69rem] font-bold text-zinc-500">{dataAtual.weekday}</div>
          <div className="mt-0.5 whitespace-nowrap text-sm font-black text-zinc-950">{dataAtual.dayMonth}</div>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.2em] text-amber-700">
          <Clock3 size={15} /> Próximo atendimento
        </div>

        {proximo ? (
          <>
            <div className="mt-3 flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[0.95rem] bg-amber-50 text-amber-800"><Users size={22} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[2rem] font-black leading-none tracking-[-0.05em] text-zinc-950">{proximo.hora_inicio.slice(0, 5)}</div>
                <div className="mt-1 truncate text-[1.05rem] font-black text-zinc-950">{proximo.clientes?.nome || "Cliente"}</div>
                <div className="mt-0.5 text-sm font-bold leading-5 text-zinc-500">{proximo.servicos?.nome || "Serviço"}{durationText(proximo) ? ` • ${durationText(proximo)}` : ""}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" className="h-11 rounded-[0.95rem] border-amber-200 text-zinc-950" onClick={() => setDetails(proximo)}><Eye size={15} />Ver detalhes</Button>
              <Button className="h-11 rounded-[0.95rem] bg-amber-500 text-zinc-950 hover:bg-amber-400" onClick={() => goTo("agenda")}><span>Abrir agenda</span><ChevronRight size={15} /></Button>
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-[1rem] border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm font-bold text-zinc-500">Nenhum próximo atendimento para hoje.</div>
        )}
      </section>

      <section className="grid grid-cols-3 overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white shadow-[0_5px_16px_rgba(15,23,42,0.035)]">
        <Metric icon={<CalendarClock size={17} />} value={hojeItens.length} label="Hoje" tone="amber" />
        <Metric icon={<CheckCircle2 size={17} />} value={concluidos} label="Concluídos" tone="emerald" />
        <Metric icon={<CircleDollarSign size={17} />} value={money(previsto)} label="Previsto" tone="amber" />
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <ActionCard icon={<CalendarClock size={19} />} title="Agenda" text="Ver horários" onClick={() => goTo("agenda")} tone="amber" />
        <ActionCard icon={<Users size={19} />} title="Clientes" text={`${clientes.length} cadastros`} onClick={() => goTo("clientes")} tone="emerald" />
        <ActionCard icon={<Scissors size={19} />} title="Serviços" text={`${servicos.length} ativos`} onClick={() => goTo("servicos")} tone="violet" />
        <ActionCard icon={<CircleDollarSign size={19} />} title="Comandas" text={`${comandas.filter((item) => item.status === "aberta").length} abertas`} onClick={() => goTo("comandas")} tone="rose" />
      </div>

      <Modal title="Detalhes do agendamento" subtitle="Informações principais deste atendimento." open={Boolean(details)} onClose={() => setDetails(null)}>
        {details ? <AppointmentDetails item={details} /> : null}
      </Modal>
    </div>
  );
}

function Metric({ icon, value, label, tone }: { icon: React.ReactNode; value: string | number; label: string; tone: "amber" | "emerald" }) {
  const toneClass = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800";
  return (
    <div className="min-w-0 border-r border-zinc-100 px-2.5 py-3 last:border-r-0">
      <div className="flex min-w-0 items-center gap-2">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-[0.8rem] ${toneClass}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.96rem] font-black tracking-[-0.035em] text-zinc-950">{value}</div>
          <div className="mt-0.5 truncate text-[0.64rem] font-black text-zinc-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, text, onClick, tone }: { icon: React.ReactNode; title: string; text: string; onClick: () => void; tone: "amber" | "emerald" | "violet" | "rose" }) {
  const tones = { amber: "bg-amber-50 text-amber-800", emerald: "bg-emerald-50 text-emerald-700", violet: "bg-violet-50 text-violet-700", rose: "bg-rose-50 text-rose-700" };
  return (
    <button onClick={onClick} className="flex min-h-[5rem] items-center gap-3 rounded-[1rem] border border-zinc-200 bg-white px-3 py-3 text-left shadow-[0_4px_14px_rgba(15,23,42,0.035)] transition active:scale-[0.99] active:bg-zinc-50">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-[0.9rem] ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.98rem] font-black tracking-[-0.035em] text-zinc-950">{title}</div>
        <div className="mt-0.5 truncate text-[0.75rem] font-bold text-zinc-500">{text}</div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-zinc-400" />
    </button>
  );
}

function AppointmentDetails({ item }: { item: Agendamento }) {
  return (
    <div className="space-y-3">
      <div className="rounded-[1.3rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
        <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-amber-700">Atendimento</div>
        <div className="mt-2 text-2xl font-black tracking-[-0.05em] text-zinc-950">{item.clientes?.nome || "Cliente"}</div>
        <div className="mt-1 text-sm font-bold text-zinc-500">{item.servicos?.nome || "Serviço"}</div>
      </div>
      <DetailRow label="Horário" value={`${item.data} · ${item.hora_inicio.slice(0, 5)} às ${item.hora_fim.slice(0, 5)}`} />
      <DetailRow label="Status" value={String(item.status || "pendente").replaceAll("_", " ")} />
      <DetailRow label="Profissional" value={item.profissional_nome || "Profissional"} />
      <DetailRow label="Agendado por" value={`${item.agendado_por_nome || "Não identificado"} • ${bookingSourceLabel(item.origem)}`} />
      <DetailRow label="Agendado em" value={formatCreatedAt(item.agendado_em || item.created_at)} />
      <DetailRow label="Confirmação da cliente" value={item.cliente_confirmacao_status === "confirmado" ? "Confirmada" : "Aguardando confirmação da cliente"} />
      {item.observacoes ? <DetailRow label="Observações" value={item.observacoes} /> : null}
      <DetailRow label="Caixa" value={item.id_comanda ? "Comanda vinculada" : "Sem comanda vinculada"} />
      <DetailRow label="Sinal Pix" value={item.sinal_valor ? `${item.sinal_status || "Sem status"} • ${money(Number(item.sinal_valor))}` : "Sem sinal"} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.15rem] border border-zinc-100 bg-zinc-50/80 px-4 py-3.5"><div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div><div className="mt-1 text-sm font-black leading-5 text-zinc-900">{value}</div></div>;
}
