"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CalendarCheck2,
  Cake,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Radar,
  Sparkles,
  Megaphone,
  LifeBuoy,
  WalletCards,
} from "lucide-react";

export type ShellNotificationTone =
  | "danger"
  | "warning"
  | "success"
  | "info"
  | "neutral";

export type ShellNotificationCategory =
  | "assinatura"
  | "agenda"
  | "aniversario"
  | "caixa"
  | "estoque"
  | "marketing"
  | "onboarding"
  | "suporte"
  | "sistema"
  | "webhook";

export type ShellNotification = {
  id: string;
  title: string;
  description: string;
  tone: ShellNotificationTone;
  category: ShellNotificationCategory;
  href?: string;
  critical?: boolean;
};

type Props = {
  notifications: ShellNotification[];
  storageKey?: string;
  onOpenHelp?: () => void;
};

const toneClass: Record<ShellNotificationTone, string> = {
  danger: "bg-rose-50 text-rose-700 ring-rose-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  info: "bg-sky-50 text-sky-700 ring-sky-100",
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

function NotificationIcon({
  category,
  tone,
}: {
  category: ShellNotificationCategory;
  tone: ShellNotificationTone;
}) {
  const className = clsx(
    "h-9 w-9 rounded-2xl p-2 ring-1",
    toneClass[tone]
  );

  if (category === "assinatura") return <CreditCard className={className} />;
  if (category === "agenda") return <CalendarCheck2 className={className} />;
  if (category === "aniversario") return <Cake className={className} />;
  if (category === "caixa") return <WalletCards className={className} />;
  if (category === "estoque") return <Boxes className={className} />;
  if (category === "marketing") return <Megaphone className={className} />;
  if (category === "onboarding") return <Sparkles className={className} />;
  if (category === "suporte") return <LifeBuoy className={className} />;
  if (category === "webhook") return <Radar className={className} />;
  if (tone === "success") return <CheckCircle2 className={className} />;

  return <AlertTriangle className={className} />;
}

function buildStorageKey(storageKey?: string) {
  return storageKey ? `salaopremium:notificacoes:${storageKey}` : null;
}

export default function NotificationBell({
  notifications,
  storageKey,
  onOpenHelp,
}: Props) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const persistedKey = buildStorageKey(storageKey);

  useEffect(() => {
    if (!persistedKey) {
      setReadIds([]);
      setHydrated(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(persistedKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setReadIds(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
    } catch {
      setReadIds([]);
    } finally {
      setHydrated(true);
    }
  }, [persistedKey]);

  const persistReadIds = useCallback((next: string[]) => {
    setReadIds(next);

    if (!persistedKey) return;

    try {
      window.localStorage.setItem(persistedKey, JSON.stringify(next));
    } catch {
      // localStorage pode falhar em navegadores restritos; nesse caso,
      // mantemos o estado apenas em memoria durante a sessao atual.
    }
  }, [persistedKey]);

  const isRead = useCallback((notification: ShellNotification) => {
    if (notification.critical) return false;
    return readIds.includes(notification.id);
  }, [readIds]);

  function markAsRead(notificationId: string) {
    if (readIds.includes(notificationId)) return;
    persistReadIds([...readIds, notificationId]);
  }

  function markAllAsRead() {
    const next = notifications
      .filter((notification) => !notification.critical)
      .map((notification) => notification.id);
    persistReadIds(next);
  }

  const visibleNotifications = useMemo(
    () =>
      [...notifications]
        .filter((notification) => !isRead(notification))
        .sort((a, b) => Number(Boolean(b.critical)) - Number(Boolean(a.critical)))
        .slice(0, 8),
    [isRead, notifications]
  );
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !isRead(notification)).length,
    [isRead, notifications]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!hydrated || !notifications.length || !readIds.length) return;

    const validIds = readIds.filter((id) =>
      notifications.some(
        (notification) => notification.id === id && !notification.critical
      )
    );

    if (validIds.length !== readIds.length) {
      persistReadIds(validIds);
    }
  }, [hydrated, notifications, persistReadIds, readIds]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--app-accent)] hover:text-zinc-950",
          open && "border-[var(--app-accent)] text-zinc-950"
        )}
        aria-label="Abrir notificacoes"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(360px,calc(100vw-1.5rem))] rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between px-2 pb-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                Central
              </div>
              <div className="font-display text-lg font-bold text-zinc-950">
                Notificacoes
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                Criticos ficam visiveis ate a resolucao.
              </div>
            </div>

            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">
              {unreadCount}
            </span>
          </div>

          <div className="scroll-premium max-h-[390px] space-y-2 overflow-y-auto pr-1">
            {visibleNotifications.length > 0 ? (
              visibleNotifications.map((notification) => {
                const content = (
                  <>
                    <NotificationIcon
                      category={notification.category}
                      tone={notification.tone}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-bold text-zinc-900">
                        {notification.title}
                      </div>
                      {notification.critical ? (
                        <div className="mt-1 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
                          Critico
                        </div>
                      ) : null}
                      <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-500">
                        {notification.description}
                      </div>
                    </div>

                    {notification.href ? (
                      <ChevronRight size={16} className="text-zinc-300" />
                    ) : null}
                  </>
                );

                if (notification.href) {
                  return (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      onClick={() => {
                        markAsRead(notification.id);
                        setOpen(false);
                      }}
                      className="flex items-start gap-3 rounded-[22px] border border-zinc-100 bg-zinc-50/80 p-3 transition hover:border-zinc-200 hover:bg-white"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => {
                      markAsRead(notification.id);
                    }}
                    className="flex w-full items-start gap-3 rounded-[22px] border border-zinc-100 bg-zinc-50/80 p-3 text-left transition hover:border-zinc-200 hover:bg-white"
                  >
                    {content}
                  </button>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-500">
                Tudo quieto por aqui. Quando houver assinatura vencendo,
                aniversario, agenda finalizada ou alerta do caixa, aparece aqui.
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-2 pt-3">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-zinc-950 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Marcar lidas
            </button>

            {onOpenHelp ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenHelp();
                }}
                className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-800"
              >
                Abrir ajuda guiada
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
