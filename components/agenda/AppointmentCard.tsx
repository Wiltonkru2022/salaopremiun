"use client";

import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import { Agendamento } from "@/types/agenda";
import { getStatusStyles, normalizeTimeString } from "@/lib/utils/agenda";
import {
  Clock3,
  DollarSign,
  GripVertical,
  Pencil,
  Scissors,
  Trash2,
  User2,
} from "lucide-react";

type Props = {
  item: Agendamento;
  top: number;
  height: number;
  leftPercent?: number;
  widthPercent?: number;
  profissionalNome?: string;
  profissionalFotoUrl?: string | null;
  dayColumnWidthPx: number;
  onResizeEnd: (item: Agendamento, newDuration: number) => void;
  onMoveEnd: (
    item: Agendamento,
    move: { minutesDelta: number; dayDelta: number }
  ) => void;
  onClick: (item: Agendamento) => void;
  onDelete: (item: Agendamento) => void;
  onGoToCashier: (item: Agendamento) => void;
};

const PX_PER_15_MIN = 22;
const MIN_CARD_HEIGHT = 30;
const DRAG_THRESHOLD = 5;
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function AppointmentCard({
  item,
  top,
  height,
  leftPercent = 0,
  widthPercent = 100,
  profissionalNome,
  profissionalFotoUrl,
  dayColumnWidthPx,
  onResizeEnd,
  onMoveEnd,
  onClick,
  onDelete,
  onGoToCashier,
}: Props) {
  const styles = getStatusStyles(item.status);

  const [previewTop, setPreviewTop] = useState<number | null>(null);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);
  const [previewDayDelta, setPreviewDayDelta] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  const ignoreClickRef = useRef(false);

  const effectiveTop = previewTop ?? top;
  const effectiveHeight = Math.max(MIN_CARD_HEIGHT, previewHeight ?? height);

  const isTiny = effectiveHeight <= 34;
  const isSmall = effectiveHeight > 34 && effectiveHeight <= 56;
  const isMedium = effectiveHeight > 56 && effectiveHeight <= 96;

  const statusLabel = useMemo(() => {
    switch (item.status) {
      case "confirmado":
        return "Confirmado";
      case "pendente":
        return "Pendente";
      case "atendido":
        return "Atendido";
      case "cancelado":
        return "Cancelado";
      case "aguardando_pagamento":
        return "Aguardando caixa";
      default:
        return item.status;
    }
  }, [item.status]);

  const valorServico = useMemo(
    () => currencyFormatter.format(Number(item.servico?.preco || 0)),
    [item.servico?.preco]
  );

  const comandaLabel = item.comanda_numero ? `Comanda #${item.comanda_numero}` : "";

  function resetPreview() {
    setPreviewTop(null);
    setPreviewHeight(null);
    setPreviewDayDelta(0);
    setDragging(false);
    setResizing(false);
  }

  function safeIgnoreClick() {
    ignoreClickRef.current = true;
    window.setTimeout(() => {
      ignoreClickRef.current = false;
    }, 180);
  }

  function handleResizeMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();

    setResizing(true);

    const startY = e.clientY;
    const startHeight = Math.max(MIN_CARD_HEIGHT, height);
    let currentDuration = Math.max(15, item.duracao_minutos || 15);
    let moved = false;

    function onMove(ev: MouseEvent) {
      ev.preventDefault();

      const delta = ev.clientY - startY;
      const rawHeight = Math.max(MIN_CARD_HEIGHT, startHeight + delta);
      const snappedBlocks = Math.max(1, Math.round(rawHeight / PX_PER_15_MIN));
      const snappedHeight = snappedBlocks * PX_PER_15_MIN;
      const duration = snappedBlocks * 15;

      if (Math.abs(delta) > 0) moved = true;

      currentDuration = duration;
      setPreviewHeight(snappedHeight);
    }

    function onUp() {
      resetPreview();

      if (moved) {
        safeIgnoreClick();
        onResizeEnd(item, currentDuration);
      }

      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleDragMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    if (
      target.closest("[data-no-drag='true']") ||
      target.closest("[data-resize='true']")
    ) {
      return;
    }

    e.preventDefault();

    const startY = e.clientY;
    const startX = e.clientX;

    let moved = false;
    let dragStarted = false;
    let minutesDelta = 0;
    let dayDelta = 0;

    function onMove(ev: MouseEvent) {
      ev.preventDefault();

      const deltaY = ev.clientY - startY;
      const deltaX = ev.clientX - startX;

      if (
        !dragStarted &&
        (Math.abs(deltaY) >= DRAG_THRESHOLD || Math.abs(deltaX) >= DRAG_THRESHOLD)
      ) {
        dragStarted = true;
        moved = true;
        setDragging(true);
      }

      if (!dragStarted) return;

      const snappedBlocksY = Math.round(deltaY / PX_PER_15_MIN);
      minutesDelta = snappedBlocksY * 15;
      dayDelta = Math.round(deltaX / Math.max(dayColumnWidthPx, 1));

      setPreviewTop(top + snappedBlocksY * PX_PER_15_MIN);
      setPreviewDayDelta(dayDelta);
    }

    function onUp() {
      if (moved) {
        resetPreview();
        safeIgnoreClick();
        onMoveEnd(item, { minutesDelta, dayDelta });
      }

      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleCardClick() {
    if (dragging || resizing || ignoreClickRef.current) return;
    onClick(item);
  }

  return (
    <>
      {(dragging || resizing) && (
        <div
          className="pointer-events-none absolute rounded-[16px] border border-dashed border-zinc-500 bg-zinc-950/10 select-none"
          style={{
            top: effectiveTop,
            height: effectiveHeight,
            left: `calc(${leftPercent}% + 4px + ${previewDayDelta * dayColumnWidthPx}px)`,
            width: `calc(${widthPercent}% - 8px)`,
            zIndex: 50,
          }}
        />
      )}

      <div
        className={clsx(
          "absolute overflow-hidden rounded-[16px] border shadow-sm transition-all duration-150 select-none",
          "hover:-translate-y-[1px] hover:shadow-md",
          "cursor-grab active:cursor-grabbing",
          styles.card,
          dragging || resizing ? "z-40 scale-[1.01]" : "z-20"
        )}
        style={{
          top: effectiveTop,
          height: effectiveHeight,
          left: `calc(${leftPercent}% + 4px + ${previewDayDelta * dayColumnWidthPx}px)`,
          width: `calc(${widthPercent}% - 8px)`,
        }}
        onMouseDown={handleDragMouseDown}
        onClick={handleCardClick}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="absolute inset-y-0 left-0 w-1.5 bg-white/30" />

        <div
          className={clsx(
            "relative h-full w-full select-none",
            isTiny ? "px-2 py-1.5" : isSmall ? "px-3 py-2.5" : "p-3"
          )}
        >
          {isTiny ? (
            <div className="flex h-full items-center gap-2 select-none">
              <GripVertical size={11} className="shrink-0 opacity-70" />
              <div className="min-w-0 flex-1 truncate text-[10px] font-semibold">
                {item.cliente?.nome || "Cliente"}
              </div>
              <div className="text-[9px] opacity-90">
                {normalizeTimeString(item.hora_inicio)}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-between gap-2 select-none">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <GripVertical size={11} className="shrink-0 opacity-70" />

                    {profissionalFotoUrl ? (
                      <img
                        src={profissionalFotoUrl}
                        alt={profissionalNome || "Profissional"}
                        draggable={false}
                        className={clsx(
                          "shrink-0 rounded-full border border-white/40 object-cover select-none pointer-events-none",
                          isSmall ? "h-5 w-5" : "h-7 w-7"
                        )}
                      />
                    ) : (
                      <div
                        className={clsx(
                          "flex shrink-0 items-center justify-center rounded-full bg-white/20 select-none",
                          isSmall ? "h-5 w-5" : "h-7 w-7"
                        )}
                      >
                        <User2 size={isSmall ? 10 : 12} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div
                        className={clsx(
                          "truncate font-bold leading-tight",
                          isSmall ? "text-[10px]" : "text-[13px]"
                        )}
                      >
                        {item.cliente?.nome || "Cliente"}
                      </div>

                      {!isSmall && profissionalNome ? (
                        <div className="truncate text-[10px] opacity-85">
                          {profissionalNome}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    data-no-drag="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick(item);
                    }}
                    className="rounded-md bg-white/20 p-1 transition hover:bg-white/30"
                    title="Editar"
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
                    className="rounded-md bg-white/20 p-1 transition hover:bg-white/30"
                    title="Excluir"
                  >
                    <Trash2 size={11} />
                  </button>

                  {item.status === "aguardando_pagamento" ? (
                    <button
                      type="button"
                      data-no-drag="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGoToCashier(item);
                      }}
                      className="rounded-md bg-white/25 p-1 transition hover:bg-white/35"
                      title="Ir para caixa"
                    >
                      <DollarSign size={11} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={clsx(
                    "rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                    styles.badge
                  )}
                >
                  {statusLabel}
                </span>

                {comandaLabel && !isSmall ? (
                  <span className="rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[9px] font-semibold">
                    {comandaLabel}
                  </span>
                ) : null}

                {!isSmall ? (
                  <span className="rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[9px] font-semibold">
                    {valorServico}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] opacity-95">
                  <Clock3 size={10} />
                  <span>
                    {normalizeTimeString(item.hora_inicio)} -{" "}
                    {normalizeTimeString(item.hora_fim)}
                  </span>
                </div>

                {!isSmall ? (
                  <div className="flex items-center gap-1.5 text-[10px] opacity-95">
                    <Scissors size={10} />
                    <span className="truncate">{item.servico?.nome || "Servico"}</span>
                  </div>
                ) : null}

                {!isSmall && item.status === "aguardando_pagamento" ? (
                  <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[9px] font-semibold">
                    <DollarSign size={9} />
                    Pronto para caixa
                  </div>
                ) : null}

                {!isMedium && item.observacoes ? (
                  <div className="line-clamp-2 text-[10px] opacity-90">
                    {item.observacoes}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div
          data-resize="true"
          onMouseDown={handleResizeMouseDown}
          className={clsx(
            "absolute bottom-0 left-0 right-0 cursor-ns-resize bg-black/15",
            isTiny ? "h-1.5 rounded-b-[12px]" : "h-2 rounded-b-[16px]"
          )}
          title="Arraste para alterar duracao"
        />
      </div>
    </>
  );
}
