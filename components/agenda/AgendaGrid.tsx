"use client";

import clsx from "clsx";
import { addDays } from "date-fns";
import { useEffect, useState } from "react";
import {
  AgendaDensityMode,
  Agendamento,
  Bloqueio,
  Profissional,
  ViewMode,
} from "@/types/agenda";
import {
  buildForaExpedienteBloqueiosDoProfissional,
  buildPausasBloqueiosDoProfissional,
  buildTimeSlots,
  formatDayLabel,
  formatFullDate,
  getWeekDays,
  isDiaFuncionamento,
  isTodayDate,
  mergeBloqueios,
  minutesToTime,
  normalizeTimeString,
  timeToMinutes,
} from "@/lib/utils/agenda";
import AppointmentCard from "./AppointmentCard";
import {
  Clock3,
  GripVertical,
  Lock,
  Pencil,
  Trash2,
} from "lucide-react";

type Props = {
  viewMode: ViewMode;
  currentDate: Date;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  diasFuncionamento: string[];
  agendamentos: Agendamento[];
  bloqueios: Bloqueio[];
  selectedProfessional?: Profissional | null;
  densityMode?: AgendaDensityMode;
  onClickSlot: (date: string, time: string) => void;
  onResizeEvent: (item: Agendamento, newDuration: number) => void;
  onMoveEvent: (
    item: Agendamento,
    move: { newDate: string; newStartTime: string }
  ) => void;
  onEditEvent: (item: Agendamento) => void;
  onDeleteEvent: (item: Agendamento) => void;
  onGoToCashier: (item: Agendamento) => void;
  onEditBlock: (item: Bloqueio) => void;
  onDeleteBlock: (item: Bloqueio) => void;
  onMoveBlock: (
    item: Bloqueio,
    newStartTime: string,
    newEndTime: string,
    newDate?: string
  ) => void;
  onResizeBlock: (item: Bloqueio, newEndTime: string) => void;
  isExpanded?: boolean;
};

type PositionedEvent = {
  item: Agendamento;
  leftPercent: number;
  widthPercent: number;
};

function computeEventColumns(items: Agendamento[]): PositionedEvent[] {
  const sorted = [...items].sort((a, b) => {
    const startDiff =
      timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio);
    if (startDiff !== 0) return startDiff;

    return timeToMinutes(a.hora_fim) - timeToMinutes(b.hora_fim);
  });

  const positioned: PositionedEvent[] = [];

  let currentGroup: Agendamento[] = [];
  let groupMaxEnd = 0;

  function flushGroup() {
    if (currentGroup.length === 0) return;

    const columnsEndTime: number[] = [];
    const temp: { item: Agendamento; columnIndex: number }[] = [];

    for (const item of currentGroup) {
      const itemStart = timeToMinutes(item.hora_inicio);
      const itemEnd = timeToMinutes(item.hora_fim);

      let placed = false;

      for (let i = 0; i < columnsEndTime.length; i++) {
        if (itemStart >= columnsEndTime[i]) {
          columnsEndTime[i] = itemEnd;
          temp.push({ item, columnIndex: i });
          placed = true;
          break;
        }
      }

      if (!placed) {
        columnsEndTime.push(itemEnd);
        temp.push({ item, columnIndex: columnsEndTime.length - 1 });
      }
    }

    const totalColumns = Math.max(columnsEndTime.length, 1);
    const widthPercent = 100 / totalColumns;

    for (const entry of temp) {
      positioned.push({
        item: entry.item,
        leftPercent: entry.columnIndex * widthPercent,
        widthPercent,
      });
    }

    currentGroup = [];
    groupMaxEnd = 0;
  }

  for (const item of sorted) {
    const itemStart = timeToMinutes(item.hora_inicio);
    const itemEnd = timeToMinutes(item.hora_fim);

    if (currentGroup.length === 0) {
      currentGroup.push(item);
      groupMaxEnd = itemEnd;
      continue;
    }

    if (itemStart < groupMaxEnd) {
      currentGroup.push(item);
      groupMaxEnd = Math.max(groupMaxEnd, itemEnd);
    } else {
      flushGroup();
      currentGroup.push(item);
      groupMaxEnd = itemEnd;
    }
  }

  flushGroup();

  return positioned;
}

type BlockCardProps = {
  item: Bloqueio;
  top: number;
  height: number;
  dayColumnWidthPx: number;
  pixelsPer15Min: number;
  onEdit: (item: Bloqueio) => void;
  onDelete: (item: Bloqueio) => void;
  onMove: (
    item: Bloqueio,
    newStartTime: string,
    newEndTime: string,
    newDate?: string
  ) => void;
  onResize: (item: Bloqueio, newEndTime: string) => void;
  baseDate: string;
};

function BlockCard({
  item,
  top,
  height,
  dayColumnWidthPx,
  pixelsPer15Min,
  onEdit,
  onDelete,
  onMove,
  onResize,
  baseDate,
}: BlockCardProps) {
  const [previewTop, setPreviewTop] = useState<number | null>(null);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);
  const [previewDayDelta, setPreviewDayDelta] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  const effectiveTop = previewTop ?? top;
  const effectiveHeight = Math.max(36, previewHeight ?? height);

  function handleDragMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    if (
      target.closest("[data-no-drag='true']") ||
      target.closest("[data-resize='true']")
    ) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    setDragging(true);

    const startY = e.clientY;
    const startX = e.clientX;
    const startTop = top;
    const startMinutes = timeToMinutes(item.hora_inicio);
    const duration =
      timeToMinutes(item.hora_fim) - timeToMinutes(item.hora_inicio);

    let nextStartMinutes = startMinutes;
    let nextDayDelta = 0;

    function onMoveMouse(ev: MouseEvent) {
      ev.preventDefault();

      const deltaY = ev.clientY - startY;
      const deltaX = ev.clientX - startX;

      const rawTop = Math.max(0, startTop + deltaY);
      const snappedTop =
        Math.round(rawTop / pixelsPer15Min) * pixelsPer15Min;

      const blocksMoved = snappedTop / pixelsPer15Min;
      const minutesDelta = blocksMoved * 15;

      nextStartMinutes = Math.max(0, startMinutes + minutesDelta);
      nextDayDelta = Math.round(deltaX / Math.max(dayColumnWidthPx, 1));

      setPreviewTop(snappedTop);
      setPreviewDayDelta(nextDayDelta);
    }

    function onUp() {
      setDragging(false);
      setPreviewTop(null);
      setPreviewDayDelta(0);

      const nextDate = formatFullDate(
        addDays(new Date(`${baseDate}T12:00:00`), nextDayDelta)
      );

      onMove(
        item,
        minutesToTime(nextStartMinutes),
        minutesToTime(nextStartMinutes + duration),
        nextDate
      );

      window.removeEventListener("mousemove", onMoveMouse);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMoveMouse);
    window.addEventListener("mouseup", onUp);
  }

  function handleResizeMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    setResizing(true);

    const startY = e.clientY;
    const startHeight = effectiveHeight;
    let nextEndMinutes = timeToMinutes(item.hora_fim);

    function onMoveMouse(ev: MouseEvent) {
      ev.preventDefault();

      const delta = ev.clientY - startY;
      const rawHeight = Math.max(36, startHeight + delta);
      const snappedHeight =
        Math.round(rawHeight / pixelsPer15Min) * pixelsPer15Min;

      const durationBlocks = snappedHeight / pixelsPer15Min;
      const durationMinutes = durationBlocks * 15;

      nextEndMinutes = timeToMinutes(item.hora_inicio) + durationMinutes;
      setPreviewHeight(snappedHeight);
    }

    function onUp() {
      setResizing(false);
      setPreviewHeight(null);

      onResize(item, minutesToTime(nextEndMinutes));

      window.removeEventListener("mousemove", onMoveMouse);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMoveMouse);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <>
      {(dragging || resizing) && (
        <div
          className="pointer-events-none absolute rounded-[16px] border border-dashed border-zinc-400 bg-zinc-300/40 select-none"
          style={{
            top: effectiveTop,
            height: effectiveHeight,
            left: `calc(4px + ${previewDayDelta * dayColumnWidthPx}px)`,
            right: 4,
            zIndex: 35,
          }}
        />
      )}

      <div
        className={clsx(
          "absolute left-1 right-1 overflow-hidden rounded-[16px] border border-zinc-300 bg-zinc-200/85 p-2.5 text-zinc-700 shadow-sm transition-all duration-150 select-none",
          "hover:-translate-y-[1px] hover:shadow-md",
          "cursor-grab active:cursor-grabbing",
          dragging || resizing ? "z-40 scale-[1.01]" : "z-20"
        )}
        style={{
          top: effectiveTop,
          height: effectiveHeight,
          left: `calc(4px + ${previewDayDelta * dayColumnWidthPx}px)`,
          right: 4,
        }}
        onMouseDown={handleDragMouseDown}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="flex items-start justify-between gap-2 select-none">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <GripVertical size={12} className="opacity-60" />
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/60">
                <Lock size={12} />
              </div>

              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold">
                  Horário bloqueado
                </div>
                <div className="mt-0.5 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-semibold text-zinc-600">
                  Bloqueio
                </div>
              </div>
            </div>

            {effectiveHeight > 46 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-600">
                <Clock3 size={10} />
                <span>
                  {normalizeTimeString(item.hora_inicio)} -{" "}
                  {normalizeTimeString(item.hora_fim)}
                </span>
              </div>
            )}

            {effectiveHeight > 62 && (
              <div className="mt-1 truncate text-[10px] text-zinc-600">
                {item.motivo || "Indisponível"}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="rounded-md bg-white/70 p-1 text-zinc-600 transition hover:bg-white"
              title="Editar bloqueio"
            >
              <Pencil size={11} />
            </button>

            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className="rounded-md bg-white/70 p-1 text-zinc-600 transition hover:bg-white"
              title="Excluir bloqueio"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        <div
          data-resize="true"
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize rounded-b-[16px] bg-zinc-400/20"
          title="Arraste para alterar duração do bloqueio"
        />
      </div>
    </>
  );
}

export default function AgendaGrid({
  viewMode,
  currentDate,
  startTime,
  endTime,
  intervalMinutes,
  diasFuncionamento,
  agendamentos,
  bloqueios,
  selectedProfessional,
  densityMode = "standard",
  onClickSlot,
  onResizeEvent,
  onMoveEvent,
  onEditEvent,
  onDeleteEvent,
  onGoToCashier,
  onEditBlock,
  onDeleteBlock,
  onMoveBlock,
  onResizeBlock,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const compactMode = densityMode === "reception";
  const pixelsPer15Min = compactMode ? 14 : 22;
  const slotHeight = compactMode ? 28 : 44;
  const timeColWidth = compactMode ? 56 : 64;
  const dayMinWidthDay = compactMode ? 620 : 760;
  const dayMinWidthWeek = compactMode ? 132 : 170;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const slots = buildTimeSlots(startTime, endTime, intervalMinutes);
  const rawDays = viewMode === "day" ? [currentDate] : getWeekDays(currentDate);
  const days = rawDays.filter((day) => isDiaFuncionamento(day, diasFuncionamento));

  function eventTop(horaInicio: string) {
    const start = timeToMinutes(startTime);
    const eventStart = timeToMinutes(horaInicio);
    const diff = eventStart - start;
    return (diff / 15) * pixelsPer15Min;
  }

  function eventHeight(durationMinutes: number) {
    return Math.max((durationMinutes / 15) * pixelsPer15Min, compactMode ? 24 : 30);
  }

  function blockHeight(item: Bloqueio) {
    return Math.max(
      ((timeToMinutes(item.hora_fim) - timeToMinutes(item.hora_inicio)) / 15) *
        pixelsPer15Min,
      36
    );
  }

  if (days.length === 0) {
    return (
      <div className="rounded-[24px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="text-lg font-semibold text-zinc-900">Salão fechado</div>
        <div className="mt-2 text-sm text-zinc-500">
          Verifique os dias configurados em <strong>configurações da agenda</strong>.
        </div>
      </div>
    );
  }

  const dayColumnWidth = viewMode === "day" ? dayMinWidthDay : dayMinWidthWeek;
  const totalGridHeight = slots.length * slotHeight;
  const nowMinutes = timeToMinutes(
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[22px] bg-white select-none">
      <div
        className="agenda-scroll min-h-0 flex-1 overflow-auto rounded-[22px] select-none"
      >
        <div
          className="grid min-w-max select-none"
          style={{
            gridTemplateColumns:
              viewMode === "day"
                ? `${timeColWidth}px minmax(${dayColumnWidth}px, 1fr)`
                : `${timeColWidth}px repeat(${days.length}, minmax(${dayColumnWidth}px, 1fr))`,
          }}
        >
          <div
            className={`sticky left-0 top-0 z-40 flex select-none items-center border-b border-r border-zinc-200 bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 ${
              compactMode ? "h-[40px]" : "h-[50px]"
            }`}
          >
            Hora
          </div>

          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={clsx(
                `sticky top-0 z-30 select-none border-b border-l border-zinc-200 px-3 ${
                  compactMode ? "h-[40px] py-1.5" : "h-[50px] py-2"
                }`,
                isTodayDate(day) ? "bg-zinc-100" : "bg-white"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className={`truncate font-semibold text-zinc-900 ${
                      compactMode ? "text-xs" : "text-[13px]"
                    }`}
                  >
                    {formatDayLabel(day)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {agendamentos.filter((item) => item.data === formatFullDate(day)).length}{" "}
                    atendimento(s)
                  </div>
                </div>

                {isTodayDate(day) ? (
                  <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                    Hoje
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          <div className="sticky left-0 z-30 select-none border-r border-zinc-200 bg-zinc-50/70">
            {slots.map((slot) => (
              <div
                key={slot.time}
                className="flex select-none items-start justify-end border-b border-zinc-100 pr-2 pt-1 text-[10px] font-medium text-zinc-400"
                style={{ height: slotHeight }}
              >
                {slot.time}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayStr = formatFullDate(day);
            const dayAgendamentos = agendamentos.filter((a) => a.data === dayStr);

            const baseBloqueios = bloqueios.filter(
              (b) => b.data === dayStr && b.profissional_id === selectedProfessional?.id
            );

            const autoForaExpediente = selectedProfessional
              ? buildForaExpedienteBloqueiosDoProfissional({
                  idSalao: selectedProfessional.id_salao || "",
                  profissionalId: selectedProfessional.id,
                  date: dayStr,
                  agendaInicio: startTime,
                  agendaFim: endTime,
                  diasTrabalho: selectedProfessional.dias_trabalho,
                })
              : [];

            const autoPausas = selectedProfessional
              ? buildPausasBloqueiosDoProfissional({
                  idSalao: selectedProfessional.id_salao || "",
                  profissionalId: selectedProfessional.id,
                  date: dayStr,
                  pausas: selectedProfessional.pausas,
                })
              : [];

            const dayBloqueios = mergeBloqueios(baseBloqueios, [
              ...autoForaExpediente,
              ...autoPausas,
            ]);

            const positionedEvents = computeEventColumns(dayAgendamentos);

            return (
              <div
                key={dayStr}
                className={clsx(
                  "relative select-none border-l border-zinc-200",
                  isTodayDate(day) ? "bg-zinc-50/40" : "bg-white"
                )}
                style={{ height: totalGridHeight }}
              >
                {slots.map((slot) => (
                  <button
                    key={`${dayStr}-${slot.time}`}
                    onClick={() => onClickSlot(dayStr, slot.time)}
                    className="block w-full border-b border-zinc-100 text-left transition hover:bg-zinc-50/70"
                    style={{ height: slotHeight }}
                  />
                ))}

                {isTodayDate(day) &&
                nowMinutes >= timeToMinutes(startTime) &&
                nowMinutes <= timeToMinutes(endTime) ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10"
                    style={{ top: eventTop(minutesToTime(nowMinutes)) }}
                  >
                    <div className="relative h-[2px] bg-rose-500/80">
                      <span className="absolute -top-3 left-3 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                        {minutesToTime(nowMinutes)}
                      </span>
                    </div>
                  </div>
                ) : null}

                {dayBloqueios.map((b) => (
                  <BlockCard
                    key={`${b.id}-${b.data}-${b.hora_inicio}-${b.hora_fim}`}
                    item={b}
                    top={eventTop(b.hora_inicio)}
                    height={blockHeight(b)}
                    dayColumnWidthPx={dayColumnWidth}
                    pixelsPer15Min={pixelsPer15Min}
                    onEdit={onEditBlock}
                    onDelete={onDeleteBlock}
                    onMove={onMoveBlock}
                    onResize={onResizeBlock}
                    baseDate={dayStr}
                  />
                ))}

                {positionedEvents.map(({ item, leftPercent, widthPercent }) => (
                  <AppointmentCard
                    key={`${item.id}-${item.data}-${item.hora_inicio}-${item.hora_fim}-${item.status}`}
                    item={item}
                    densityMode={densityMode}
                    top={eventTop(item.hora_inicio)}
                    height={eventHeight(item.duracao_minutos)}
                    leftPercent={leftPercent}
                    widthPercent={widthPercent}
                    profissionalNome={selectedProfessional?.nome}
                    profissionalFotoUrl={selectedProfessional?.foto_url || null}
                    dayColumnWidthPx={dayColumnWidth}
                    onResizeEnd={onResizeEvent}
                    onMoveEnd={(ag, move) => {
                      const currentBaseDate = new Date(`${ag.data}T12:00:00`);
                      const newDate = formatFullDate(
                        addDays(currentBaseDate, move.dayDelta)
                      );

                      const currentMinutes = timeToMinutes(ag.hora_inicio);
                      const nextMinutes = currentMinutes + move.minutesDelta;

                      onMoveEvent(ag, {
                        newDate,
                        newStartTime: minutesToTime(nextMinutes),
                      });
                    }}
                    onClick={onEditEvent}
                    onDelete={onDeleteEvent}
                    onGoToCashier={onGoToCashier}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
