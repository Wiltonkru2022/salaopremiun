"use client";

import {
  CalendarPlus2,
  CircleDollarSign,
  Coffee,
  Clock3,
  Plus,
} from "lucide-react";
import AppModal from "@/components/ui/AppModal";

type Props = {
  open: boolean;
  date: string;
  time: string;
  onClose: () => void;
  onNewAppointment: () => void;
  onQuickLunch30: () => void;
  onQuickLunch60: () => void;
  onOtherAbsence: () => void;
  onCustomerCredit: () => void;
};

export default function AgendaSlotActionsModal({
  open,
  date,
  time,
  onClose,
  onNewAppointment,
  onQuickLunch30,
  onQuickLunch60,
  onOtherAbsence,
  onCustomerCredit,
}: Props) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="O que voce quer registrar?"
      description={`${date} as ${time}`}
      eyebrow="Acao rapida do horario"
      maxWidthClassName="max-w-3xl"
      panelClassName="rounded-[22px]"
      bodyClassName="px-5 py-4"
      headerClassName="px-5 py-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <ActionCard
          icon={<CalendarPlus2 size={18} />}
          title="Novo agendamento"
          description="Abrir o cadastro completo do atendimento nesse horario."
          onClick={onNewAppointment}
          primary
        />

        <ActionCard
          icon={<CircleDollarSign size={18} />}
          title="Registrar credito da cliente"
          description="Abrir o fluxo de credito da cliente a partir do caixa."
          onClick={onCustomerCredit}
        />
      </div>

      <div className="mt-4 rounded-[18px] border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Registrar ausencia
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <ActionCard
            icon={<Coffee size={18} />}
            title="Almoco 30 min"
            description="Bloqueia rapido meia hora a partir do horario clicado."
            onClick={onQuickLunch30}
          />
          <ActionCard
            icon={<Clock3 size={18} />}
            title="Almoco 1 hora"
            description="Bloqueia rapido uma hora a partir do horario clicado."
            onClick={onQuickLunch60}
          />
          <ActionCard
            icon={<Plus size={18} />}
            title="Outro bloqueio"
            description="Abrir o modal para definir motivo e duracao manualmente."
            onClick={onOtherAbsence}
          />
        </div>
      </div>
    </AppModal>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[16px] border p-4 text-left transition ${
        primary
          ? "border-zinc-900 bg-zinc-900 text-white hover:opacity-95"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        <span>{title}</span>
      </div>
      <div className={`mt-2 text-sm leading-5 ${primary ? "text-white/72" : "text-zinc-500"}`}>
        {description}
      </div>
    </button>
  );
}
