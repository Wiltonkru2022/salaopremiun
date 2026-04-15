"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Bell,
  CalendarCheck2,
  Cake,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Megaphone,
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
  | "marketing"
  | "sistema";

export type ShellNotification = {
  id: string;
  title: string;
  description: string;
  tone: ShellNotificationTone;
  category: ShellNotificationCategory;
  href?: string;
};

type Props = {
  notifications: ShellNotification[];
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
  if (category === "marketing") return <Megaphone className={className} />;
  if (tone === "success") return <CheckCircle2 className={className} />;

  return <AlertTriangle className={className} />;
}

export default function NotificationBell({ notifications }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const visibleNotifications = notifications.slice(0, 8);
  const unreadCount = notifications.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 rounded-[22px] border border-zinc-100 bg-zinc-50/80 p-3 transition hover:border-zinc-200 hover:bg-white"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 rounded-[22px] border border-zinc-100 bg-zinc-50/80 p-3"
                  >
                    {content}
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-500">
                Tudo quieto por aqui. Quando houver assinatura vencendo,
                aniversario, agenda finalizada ou alerta do caixa, aparece aqui.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
