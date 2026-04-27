"use client";

import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import { AgendaDensityMode, Agendamento } from "@/types/agenda";
import { getStatusStyles, normalizeTimeString } from "@/lib/utils/agenda";
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Scissors,
  TriangleAlert,
  User2,
  XCircle,
} from "lucide-react";

type Props = {
  item: Agendamento;
  densityMode?: AgendaDensityMode;
  top: number;
  height: number;
  leftPercent?: number;
  widthPercent?: number;
  profissionalNome?: string;
  profissionalFotoUrl?: string | null;
  dayColumnWidthPx: number;
  allowDayMove?: boolean;
  operationalSignals?: {
    isOverdue: boolean;
    isInProgress: boolean;
    hasConflict: boolean;
    tightFit: boolean;
  };
  onResizeEnd: (item: Agendamento, newDuration: number) => void;
  onMoveEnd: (
    item: Agendamento,
    move: { minutesDelta: number; dayDelta: number }
  ) => void;
  onClick: (item: Agendamento, position: { x: number; y: number }) => void;
  onDelete: (item: Agendamento) => void;
  onGoToCashier: (item: Agendamento) => void;
};

const MIN_CARD_HEIGHT = 30;
const DRAG_THRESHOLD = 5;
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function AppointmentCard({
  item,
  densityMode = "standard",
  top,
  height,
  leftPercent = 0,
  widthPercent = 100,
  profissionalNome,
  profissionalFotoUrl,
  dayColumnWidthPx,
  allowDayMove = true,
  operationalSignals,
  onResizeEnd,
  onMoveEnd,
  onClick,
  onDelete: _onDelete,
  onGoToCashier: _onGoToCashier,
}: Props) {
  const styles = getStatusStyles(item.status);
  const isOverdue = Boolean(operationalSignals?.isOverdue);
  const isInProgress = Boolean(operationalSignals?.isInProgress);
  const hasConflict = Boolean(operationalSignals?.hasConflict);
  const tightFit = Boolean(operationalSignals?.tightFit);

  const [previewTop, setPreviewTop] = useState<number | null>(null);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);
  const [previewDayDelta, setPreviewDayDelta] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  const ignoreClickRef = useRef(false);

  const effectiveTop = previewTop ?? top;
  const effectiveHeight = Math.max(MIN_CARD_HEIGHT, previewHeight ?? height);
  const compactMode = densityMode === "reception";
  const pixelsPer15Min = compactMode ? 10 : 16;
  const effectiveWidthPx = Math.max(56, (dayColumnWidthPx * widthPercent) / 100 - 8);
  const isUltraNarrow = effectiveWidthPx <= 96;
  const isNarrow = effectiveWidthPx <= (compactMode ? 122 : 148);

  const isTiny = effectiveHeight <= 34;
  const isSmall = effectiveHeight > 34 && effectiveHeight <= (compactMode ? 48 : 56);
  const isMedium =
    effectiveHeight > (compactMode ? 48 : 56) &&
    effectiveHeight <= (compactMode ? 84 : 96);

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
  const shortStatusLabel = useMemo(() => {
    switch (item.status) {
      case "confirmado":
        return "OK";
      case "pendente":
        return "Pendente";
      case "atendido":
        return "Atendido";
      case "cancelado":
        return "Cancelado";
      case "aguardando_pagamento":
        return "Caixa";
      default:
        return statusLabel;
    }
  }, [item.status, statusLabel]);

  const valorServico = useMemo(
    () => currencyFormatter.format(Number(item.servico?.preco || 0)),
    [item.servico?.preco]
  );

  const comandaLabel = item.comanda_numero ? `Comanda #${item.comanda_numero}` : "";
  const compactTitle = `${item.cliente?.nome || "Cliente"}${
    item.servico?.nome ? ` - ${item.servico.nome}` : ""
  }`;
  const compactTimeLabel = `${normalizeTimeString(item.hora_inicio)} -> ${normalizeTimeString(item.hora_fim)}`;
  const statusIcon =
    item.status === "cancelado" ? (
      <XCircle size={11} />
    ) : item.status === "aguardando_pagamento" ? (
      <CircleDollarSign size={11} />
    ) : item.status === "pendente" ? (
      <TriangleAlert size={11} />
    ) : (
      <CheckCircle2 size={11} />
    );

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
      const snappedBlocks = Math.max(1, Math.round(rawHeight / pixelsPer15Min));
      const snappedHeight = snappedBlocks * pixelsPer15Min;
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

      const snappedBlocksY = Math.round(deltaY / pixelsPer15Min);
      minutesDelta = snappedBlocksY * 15;
      dayDelta = allowDayMove
        ? Math.trunc(deltaX / Math.max(dayColumnWidthPx, 1))
        : 0;

      setPreviewTop(top + snappedBlocksY * pixelsPer15Min);
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

  function handleCardClick(event: React.MouseEvent<HTMLDivElement>) {
    if (dragging || resizing || ignoreClickRef.current) return;
    onClick(item, {
      x: Math.max(12, event.clientX),
      y: Math.max(12, event.clientY),
    });
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
          "absolute overflow-hidden rounded-[14px] border shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition-all duration-150 select-none backdrop-blur-[1px]",
          "hover:-translate-y-[1px] hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)]",
          "cursor-grab active:cursor-grabbing",
          styles.card,
          isOverdue && "ring-2 ring-rose-200 ring-offset-1",
          hasConflict && "outline outline-2 outline-amber-200 outline-offset-[-2px]",
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
        <div className="absolute inset-y-0 left-0 w-[1px] bg-white/70" />
        {isInProgress ? (
          <div className="absolute inset-x-0 top-0 h-[2px] bg-violet-400/75" />
        ) : null}

        <div
          className={clsx(
            "relative h-full w-full select-none",
            isTiny
              ? "px-2 py-1.5"
              : compactMode
                ? isSmall
                  ? "px-2.5 py-2"
                  : "px-2.5 py-2.5"
                : isSmall
                  ? "px-3 py-2.5"
                  : "px-3 py-2.5"
          )}
        >
          {isTiny ? (
            <div className="flex h-full items-center gap-2 select-none">
              <div className="min-w-0 flex-1 truncate text-[10px] font-semibold">
                {item.cliente?.nome || "Cliente"}
              </div>
              <div className="text-[9px] opacity-90">
                {normalizeTimeString(item.hora_inicio)}
              </div>
            </div>
          ) : compactMode || isNarrow ? (
            <div className="flex h-full flex-col justify-between gap-1.5 select-none">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 opacity-90">{statusIcon}</span>
                    <div
                      className={clsx(
                        "truncate font-bold leading-tight",
                        isUltraNarrow ? "text-[10px]" : "text-[11px]"
                      )}
                    >
                      {isUltraNarrow
                        ? item.cliente?.nome || "Cliente"
                        : compactTitle}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={clsx(
                  "flex items-center justify-between gap-2 opacity-95",
                  isUltraNarrow ? "text-[9px]" : "text-[10px]"
                )}
              >
                <div className="min-w-0 truncate">{compactTimeLabel}</div>
                {isOverdue && !isUltraNarrow ? (
                    <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700">
                    Atraso
                  </span>
                ) : hasConflict && !isUltraNarrow ? (
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                    Conflito
                  </span>
                ) : tightFit && !isUltraNarrow ? (
                    <span className="shrink-0 rounded-full border border-zinc-200 bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-700">
                    Encaixe
                  </span>
                ) : item.status === "aguardando_pagamento" && !isUltraNarrow ? (
                    <span className="shrink-0 rounded-full border border-white/70 bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-700">
                    Caixa
                  </span>
                ) : !isUltraNarrow ? (
                    <span className="shrink-0 rounded-full border border-white/70 bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-700">
                    {shortStatusLabel}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-between gap-2 select-none">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-medium opacity-85">
                      {normalizeTimeString(item.hora_inicio)} - {normalizeTimeString(item.hora_fim)}
                    </div>
                    <span className="shrink-0 opacity-90">{statusIcon}</span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    {profissionalFotoUrl ? (
                      <img
                        src={profissionalFotoUrl}
                        alt={profissionalNome || "Profissional"}
                        draggable={false}
                        className={clsx(
                          "shrink-0 rounded-full border border-white/50 object-cover select-none pointer-events-none",
                          isSmall ? "h-5 w-5" : "h-6 w-6"
                        )}
                      />
                    ) : (
                      <div
                        className={clsx(
                          "flex shrink-0 items-center justify-center rounded-full bg-white/30 select-none",
                          isSmall ? "h-5 w-5" : "h-6 w-6"
                        )}
                      >
                        <User2 size={isSmall ? 10 : 11} />
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
                        <div className="truncate text-[10px] opacity-75">
                          {profissionalNome}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={clsx(
                    "rounded-full border px-2 py-0.5 text-[9px] font-semibold shadow-sm",
                    styles.badge
                  )}
                >
                  {statusLabel}
                </span>

                {isOverdue ? (
                  <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[9px] font-semibold text-rose-700">
                    Atrasado
                  </span>
                ) : null}

                {hasConflict ? (
                  <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                    Conflito
                  </span>
                ) : null}

                {tightFit ? (
                  <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold text-zinc-700">
                    Encaixe apertado
                  </span>
                ) : null}

                {comandaLabel && !isSmall && !isMedium ? (
                  <span className="rounded-full border border-white/70 bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-zinc-700">
                    {comandaLabel}
                  </span>
                ) : null}

                {!isSmall && !isMedium ? (
                  <span className="rounded-full border border-white/70 bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-zinc-700">
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

                {!isSmall && item.status === "aguardando_pagamento" && !isMedium ? (
                  <div className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[9px] font-semibold text-zinc-700">
                    <CircleDollarSign size={9} />
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
            "absolute bottom-0 left-0 right-0 cursor-ns-resize bg-zinc-500/12",
            isTiny ? "h-1.5 rounded-b-[12px]" : "h-2 rounded-b-[16px]"
          )}
          title="Arraste para alterar duracao"
        />
      </div>
    </>
  );
}
