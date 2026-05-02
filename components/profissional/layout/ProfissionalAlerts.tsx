"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, ChevronRight } from "lucide-react";
import type { ProfissionalAppNotification } from "@/lib/profissional-app-notification-contracts";

type Props = {
  notifications: ProfissionalAppNotification[];
};

const STORAGE_KEY = "salaopremium:profissional-alerts:read";

export default function ProfissionalAlerts({ notifications }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [items, setItems] = useState<ProfissionalAppNotification[]>(notifications);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setReadIds(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
    } catch {
      setReadIds([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/app-profissional/notificacoes", {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!active || !response.ok || !data?.ok || !Array.isArray(data.notifications)) {
          return;
        }

        setItems(data.notifications as ProfissionalAppNotification[]);
      } catch {
        // Mantem as notificacoes iniciais se a atualizacao falhar.
      }
    }

    void loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  function markAsRead(id: string) {
    const next = Array.from(new Set([...readIds, id]));
    setReadIds(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Mantem apenas em memoria se o navegador bloquear o storage.
    }
  }

  const notification = useMemo(() => {
    if (!hydrated) return null;
    return items.find((item) => !readIds.includes(item.id)) || null;
  }, [hydrated, items, readIds]);

  if (!notification) {
    return null;
  }

  return (
    <div className="mx-3 mt-3 rounded-[1.3rem] border border-emerald-200 bg-white/96 p-3.5 shadow-[0_14px_30px_rgba(16,185,129,0.10)] sm:mx-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-700">
          <BellRing size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                Aviso do acesso
              </div>
              <h2 className="mt-1 text-[15px] font-black tracking-[-0.03em] text-zinc-950">
                {notification.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => markAsRead(notification.id)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
            >
              <CheckCircle2 size={14} />
              Entendi
            </button>
          </div>

          <p className="mt-1.5 text-sm leading-6 text-zinc-600">
            {notification.description}
          </p>

          {notification.href ? (
            <Link
              href={notification.href}
              onClick={() => markAsRead(notification.id)}
              className="mt-2.5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
            >
              {notification.actionLabel || "Abrir"}
              <ChevronRight size={16} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
