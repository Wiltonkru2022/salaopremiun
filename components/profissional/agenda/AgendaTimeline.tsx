import AgendaTimelineBlock from "./AgendaTimelineBlock";

type Card = {
  id: string;
  idComanda?: string | null;
  horario: string;
  horaFim: string;
  cliente: string;
  servico: string;
  status: string;
  top: number;
  height: number;
};

type Label = {
  hora: string;
  top: number;
};

type Pausa = {
  descricao: string;
  top: number;
  height: number;
};

type Props = {
  labels: Label[];
  cards: Card[];
  pausas: Pausa[];
  timelineHeight: number;
};

export default function AgendaTimeline({
  labels,
  cards,
  pausas,
  timelineHeight,
}: Props) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm">
      <div
        className="relative"
        style={{ height: `${timelineHeight}px` }}
      >
        <div
          className="absolute left-[67px] top-0 w-px bg-zinc-200"
          style={{ height: `${timelineHeight}px` }}
        />

        {labels.map((label) => (
          <div
            key={label.hora}
            className="absolute left-0 right-0"
            style={{ top: `${label.top}px` }}
          >
            <div className="flex items-start">
              <div className="w-[58px] text-right">
                <div className="text-[0.95rem] font-semibold text-zinc-900">
                  {label.hora}
                </div>
              </div>

              <div className="relative ml-4 flex-1">
                <div className="absolute -left-[10px] top-[6px] h-4 w-4 rounded-full border-4 border-white bg-[#c89b3c] shadow-sm" />
              </div>
            </div>
          </div>
        ))}

        {pausas.map((pausa, index) => (
          <div
            key={`${pausa.descricao}-${index}`}
            className="absolute left-[84px] right-0 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs font-medium text-amber-700"
            style={{
              top: `${pausa.top}px`,
              height: `${pausa.height}px`,
            }}
          >
            {pausa.descricao}
          </div>
        ))}

        {cards.map((card) => (
          <AgendaTimelineBlock
            key={card.id}
            id={card.id}
            idComanda={card.idComanda}
            horario={card.horario}
            horaFim={card.horaFim}
            cliente={card.cliente}
            servico={card.servico}
            status={card.status}
            top={card.top}
            height={card.height}
          />
        ))}
      </div>
    </div>
  );
}