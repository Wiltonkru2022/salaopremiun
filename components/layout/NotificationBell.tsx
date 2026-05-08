"use client";

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
import type {
  ShellNotification,
  ShellNotificationCategory,
  ShellNotificationIcon,
  ShellNotificationTone,
} from "@/lib/notifications/contracts";
import { getAssinaturaUrl, getPainelUrl } from "@/lib/site-urls";
import {
  getWorkspaceWindowTarget,
  isPainelStandaloneWindow,
  openPainelWorkspaceWindow,
} from "@/lib/painel/workspace-windows";

type Props = {
  notifications: ShellNotification[];
  storageKey?: string;
  onOpenHelp?: () => void;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_NOTIFICATION_ID = "instalar-app-salao";
const INSTALL_STATE_KEY = "sp_painel_app_installed";

const toneClass: Record<ShellNotificationTone, string> = {
  danger: "bg-rose-50 text-rose-700 ring-rose-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  info: "bg-sky-50 text-sky-700 ring-sky-100",
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

function NotificationIcon({
  category,
  icon,
  tone,
}: {
  category: ShellNotificationCategory;
  icon?: ShellNotificationIcon;
  tone: ShellNotificationTone;
}) {
  const className = clsx(
    "h-9 w-9 rounded-2xl p-2 ring-1",
    toneClass[tone]
  );

  const normalizedIcon = icon || category;

  if (normalizedIcon === "assinatura") return <CreditCard className={className} />;
  if (normalizedIcon === "agenda") return <CalendarCheck2 className={className} />;
  if (normalizedIcon === "aniversario") return <Cake className={className} />;
  if (normalizedIcon === "caixa") return <WalletCards className={className} />;
  if (normalizedIcon === "estoque") return <Boxes className={className} />;
  if (normalizedIcon === "marketing") return <Megaphone className={className} />;
  if (normalizedIcon === "onboarding") return <Sparkles className={className} />;
  if (normalizedIcon === "suporte") return <LifeBuoy className={className} />;
  if (normalizedIcon === "webhook") return <Radar className={className} />;
  if (tone === "success") return <CheckCircle2 className={className} />;

  return <AlertTriangle className={className} />;
}

function buildStorageKey(storageKey?: string) {
  return storageKey ? `salaopremium:notificacoes:${storageKey}` : null;
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isDesktopViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 1024px)").matches;
}

export default function NotificationBell({
  notifications,
  storageKey,
  onOpenHelp,
}: Props) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallNotice, setShowInstallNotice] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const persistedKey = buildStorageKey(storageKey);

  useEffect(() => {
    function refreshInstallNotice() {
      const alreadyInstalled =
        isStandaloneApp() ||
        window.localStorage.getItem(INSTALL_STATE_KEY) === "1";

      setShowInstallNotice(isDesktopViewport() && !alreadyInstalled);
    }

    refreshInstallNotice();

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstallNotice(isDesktopViewport() && !isStandaloneApp());
    };

    const onAppInstalled = () => {
      window.localStorage.setItem(INSTALL_STATE_KEY, "1");
      setInstallPrompt(null);
      setShowInstallNotice(false);
    };

    const viewportQuery = window.matchMedia("(min-width: 1024px)");
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    viewportQuery.addEventListener("change", refreshInstallNotice);
    standaloneQuery.addEventListener("change", refreshInstallNotice);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      viewportQuery.removeEventListener("change", refreshInstallNotice);
      standaloneQuery.removeEventListener("change", refreshInstallNotice);
    };
  }, []);

  const allNotifications = useMemo(() => {
    if (!showInstallNotice) return notifications;

    const installNotification: ShellNotification = {
      id: INSTALL_NOTIFICATION_ID,
      title: "Instalar app do salão",
      description:
        "Instale o SalãoPremium no computador para abrir o painel como aplicativo.",
      tone: "info",
      category: "sistema",
      severity: "medium",
      eventType: "install_salon_app",
      actionLabel: installPrompt
        ? "Instalar agora"
        : "Use o icone de instalar do navegador",
      destination: "internal",
      icon: "onboarding",
      sourceModule: "pwa",
      persistUntilResolved: true,
      expiresAt: null,
    };

    return [installNotification, ...notifications];
  }, [installPrompt, notifications, showInstallNotice]);

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
    if (notification.critical || notification.persistUntilResolved) return false;
    return readIds.includes(notification.id);
  }, [readIds]);

  function markAsRead(notificationId: string) {
    if (readIds.includes(notificationId)) return;
    persistReadIds([...readIds, notificationId]);
  }

  function markAllAsRead() {
    const next = allNotifications
      .filter(
        (notification) =>
          !notification.critical && !notification.persistUntilResolved
      )
      .map((notification) => notification.id);
    persistReadIds(next);
  }

  const visibleNotifications = useMemo(
    () =>
      [...allNotifications]
        .filter((notification) => !isRead(notification))
        .sort((a, b) => {
          const bPinned = Boolean(b.critical || b.persistUntilResolved);
          const aPinned = Boolean(a.critical || a.persistUntilResolved);
          return Number(bPinned) - Number(aPinned);
        })
        .slice(0, 8),
    [allNotifications, isRead]
  );
  const unreadCount = useMemo(
    () => allNotifications.filter((notification) => !isRead(notification)).length,
    [allNotifications, isRead]
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
    if (!hydrated || !allNotifications.length || !readIds.length) return;

    const validIds = readIds.filter((id) =>
      allNotifications.some(
        (notification) =>
          notification.id === id &&
          !notification.critical &&
          !notification.persistUntilResolved
      )
    );

    if (validIds.length !== readIds.length) {
      persistReadIds(validIds);
    }
  }, [allNotifications, hydrated, persistReadIds, readIds]);

  async function handleInstallApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === "accepted") {
      window.localStorage.setItem(INSTALL_STATE_KEY, "1");
      setShowInstallNotice(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--app-accent)] hover:bg-zinc-50 hover:text-zinc-950",
          open && "border-[var(--app-accent)] bg-zinc-50 text-zinc-950"
        )}
        aria-label="Abrir notificações"
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
                Pendentes e críticos ficam visiveis até a resolucao.
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
                      icon={notification.icon}
                      tone={notification.tone}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-bold text-zinc-900">
                        {notification.title}
                      </div>
                      {notification.critical ||
                      notification.persistUntilResolved ? (
                        <div
                          className={clsx(
                            "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                            notification.critical
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {notification.critical ? "Critico" : "Pendente"}
                        </div>
                      ) : null}
                      <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-500">
                        {notification.description}
                      </div>
                      {notification.actionLabel ? (
                        <div className="mt-1.5 text-[11px] font-semibold text-zinc-600">
                          {notification.actionLabel}
                        </div>
                      ) : null}
                    </div>

                    {notification.href ? (
                      <ChevronRight size={16} className="text-zinc-300" />
                    ) : null}
                  </>
                );

                if (notification.href) {
                  const notificationHref = notification.href;
                  const workspaceTarget = getWorkspaceWindowTarget(
                    notificationHref
                  );
                  const standalone = isPainelStandaloneWindow();

                  return (
                    <a
                      key={notification.id}
                      href={getNotificationHref(notificationHref)}
                      target={workspaceTarget && !standalone ? workspaceTarget : undefined}
                      onClick={(event) => {
                        markAsRead(notification.id);
                        setOpen(false);
                        if (workspaceTarget) {
                          event.preventDefault();
                          openPainelWorkspaceWindow(notificationHref);
                        }
                      }}
                      className="flex items-start gap-3 rounded-[22px] border border-zinc-100 bg-zinc-50/80 p-3 transition hover:border-zinc-200 hover:bg-white"
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => {
                      if (notification.id === INSTALL_NOTIFICATION_ID) {
                        void handleInstallApp();
                        return;
                      }
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
                Tudo quieto por aqui. Quando houver horário para confirmar,
                assinatura vencendo, aniversário ou alerta do caixa, aparece aqui.
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

function getNotificationHref(href: string) {
  if (/^https?:\/\//i.test(href)) {
    return href;
  }

  if (href === "/assinatura" || href.startsWith("/assinatura?")) {
    return getAssinaturaUrl(href);
  }

  return getPainelUrl(href);
}
