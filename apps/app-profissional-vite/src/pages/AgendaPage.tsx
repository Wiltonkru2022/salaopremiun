import { Calendar } from "../components/agenda/Calendar";
import type { Agendamento, Cliente, Profissional, ProfissionalResumo, Servico } from "../types/database";

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
    bloquearHorario: (datas: string[], horaInicio: string, duracaoMinutos: number, titulo?: string, targetProfissionalId?: string) => Promise<void>;
    confirmarPix?: (id: string) => Promise<void>;
    criarAgendamento?: (payload: { clienteId: string; servicoId: string; data: string; horaInicio: string; profissionalId?: string }) => Promise<void>;
    reagendarAgendamento?: (payload: { agendamentoId: string; data: string; horaInicio: string; horaFim: string; status: string }) => Promise<void>;
  };
}) {
  return (
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
  );
}
