import { MessageCircle } from "lucide-react";
import { Calendar } from "../components/agenda/Calendar";
import type { Agendamento, Cliente, Profissional, ProfissionalResumo, Servico } from "../types/database";

function whatsappNumber(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 11 ? `55${digits}` : digits;
}

function openConfirmationWhatsApp(item: Agendamento) {
  const phone = whatsappNumber(item.clientes?.whatsapp || item.clientes?.telefone);
  if (!phone) return;
  const firstName = String(item.clientes?.nome || "").trim().split(/\s+/)[0] || "cliente";
  const date = String(item.data || "").split("-").reverse().join("/");
  const service = item.servicos?.nome || "seu atendimento";
  const message = `Oi, ${firstName}! 😊 Passando para confirmar seu horário.\n\n📅 ${date}\n⏰ ${item.hora_inicio.slice(0, 5)}\n✨ ${service}\n\nPode me confirmar se está tudo certo?`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

export function AgendaPage({
  agendamentos,
  clientes,
  servicos,
  profissionais,
  profissionalAtual,
  selectedDate,
  setSelectedDate,
  actions
}: {
  agendamentos: Agendamento[];
  clientes: Cliente[];
  servicos: Servico[];
  profissionais: ProfissionalResumo[];
  profissionalAtual: Profissional;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  actions: {
    confirmarAgendamento: (id: string) => Promise<void>;
    excluirAgendamento: (id: string, targetProfissionalId?: string) => Promise<void>;
    bloquearHorario: (datas: string[], horaInicio: string, horaFim: string, titulo?: string, targetProfissionalId?: string) => Promise<void>;
    confirmarPix?: (id: string) => Promise<void>;
    criarAgendamento?: (payload: { clienteId: string; servicoId: string; data: string; horaInicio: string; profissionalId?: string }) => Promise<void>;
    reagendarAgendamento?: (payload: { agendamentoId: string; data: string; horaInicio: string; horaFim: string; status: string }) => Promise<void>;
  };
}) {
  const confirmaveis = agendamentos.filter((item) => item.data === selectedDate && item.status !== "bloqueado" && item.status !== "cancelado" && Boolean(whatsappNumber(item.clientes?.whatsapp || item.clientes?.telefone)));

  return (
    <div className="space-y-4">
      {confirmaveis.length ? (
        <section className="rounded-[1.3rem] border border-emerald-100 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.67rem] font-black uppercase tracking-[0.16em] text-emerald-700">WhatsApp</div>
              <div className="text-base font-black text-zinc-950">Confirmar clientes do dia</div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{confirmaveis.length}</span>
          </div>
          <div className="grid gap-2">
            {confirmaveis.map((item) => (
              <button key={`wa-${item.id}`} type="button" onClick={() => openConfirmationWhatsApp(item)} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-3 py-3 text-left active:bg-emerald-50">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><MessageCircle size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-zinc-950">{item.hora_inicio.slice(0, 5)} · {item.clientes?.nome || "Cliente"}</div>
                  <div className="truncate text-xs font-bold text-zinc-500">{item.servicos?.nome || "Atendimento"}</div>
                </div>
                <span className="text-xs font-black text-emerald-700">Confirmar</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <Calendar
        agendamentos={agendamentos}
        clientes={clientes}
        servicos={servicos}
        profissionais={profissionais}
        profissionalAtual={profissionalAtual}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onConfirm={actions.confirmarAgendamento}
        onDelete={actions.excluirAgendamento}
        onBlock={actions.bloquearHorario}
        onConfirmPix={actions.confirmarPix}
        onCreate={actions.criarAgendamento}
        onReschedule={actions.reagendarAgendamento}
      />
    </div>
  );
}
