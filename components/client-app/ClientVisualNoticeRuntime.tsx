"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Megaphone,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

type ClientVisualNotice = {
  id: string;
  title: string;
  body: string;
  tone: string;
  url: string | null;
  imageUrl: string | null;
  presentation: "banner" | "modal";
  dismissible: boolean;
  blocking: boolean;
  buttonText: string | null;
  endsAt: string | null;
  priority: number;
};

const NOTICE_POLL_INTERVAL_MS = 5 * 60 * 1000;

function noticeIcon(tone: string) {
  if (tone === "manutencao") return ShieldAlert;
  if (tone === "aviso") return AlertTriangle;
  if (tone === "promocao") return Sparkles;
  return Megaphone;
}

function toneClasses(tone: string) {
  if (tone === "manutencao") {
    return {
      chip: "bg-amber-100 text-amber-900",
      button: "bg-amber-300 text-zinc-950 hover:bg-amber-200",
      border: "border-amber-300/30",
    };
  }

  if (tone === "aviso") {
    return {
      chip: "bg-rose-100 text-rose-900",
      button: "bg-rose-200 text-rose-950 hover:bg-rose-100",
      border: "border-rose-300/30",
    };
  }

  if (tone === "promocao") {
    return {
      chip: "bg-violet-100 text-violet-900",
      button: "bg-violet-200 text-violet-950 hover:bg-violet-100",
      border: "border-violet-300/30",
    };
  }

  return {
    chip: "bg-sky-100 text-sky-900",
    button: "bg-sky-200 text-sky-950 hover:bg-sky-100",
    border: "border-sky-300/30",
  };
}

export default function ClientVisualNoticeRuntime() {
  const router = useRouter();
  const [notice, setNotice] = useState<ClientVisualNotice | null>(null);
  const [busy, setBusy] = useState(false);

  const loadNotice = useCallback(async () => {
    try {
      const response = await fetch("/api/app-cliente/avisos", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        setNotice(null);
        return;
      }

      if (!response.ok) return;
      const payload = await response.json();
      setNotice(payload?.notice || null);
    } catch {
      // O aviso visual nunca deve impedir o app de carregar.
    }
  }, []);

  useEffect(() => {
    void loadNotice();

    const onFocus = () => void loadNotice();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadNotice();
    }, NOTICE_POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [loadNotice]);

  const record = useCallback(
    async (action: "dismiss" | "click") => {
      if (!notice?.id) return false;

      try {
        const response = await fetch("/api/app-cliente/avisos", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notice.id, action }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    [notice?.id]
  );

  const dismiss = async () => {
    if (!notice?.dismissible || busy) return;
    setBusy(true);
    const ok = await record("dismiss");
    if (ok) setNotice(null);
    setBusy(false);
  };

  const openLink = async () => {
    if (!notice?.url || busy) return;
    setBusy(true);
    await record("click");
    router.push(notice.url);
    if (notice.dismissible) setNotice(null);
    setBusy(false);
  };

  if (!notice) return null;

  const Icon = noticeIcon(notice.tone);
  const classes = toneClasses(notice.tone);

  if (notice.presentation === "banner" && !notice.blocking) {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[120] mx-auto w-full max-w-xl px-3"
        aria-live="polite"
      >
        <section
          className={`pointer-events-auto overflow-hidden rounded-[24px] border ${classes.border} bg-zinc-950 p-4 text-white shadow-2xl shadow-black/25`}
          role="status"
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${classes.chip}`}>
              <Icon size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Aviso do SalãoPremium
              </div>
              <h2 className="mt-1 text-base font-black tracking-[-0.02em]">
                {notice.title}
              </h2>
              <p className="mt-1 text-sm leading-5 text-zinc-300">{notice.body}</p>

              {notice.url ? (
                <button
                  type="button"
                  onClick={openLink}
                  disabled={busy}
                  className={`mt-3 min-h-10 rounded-xl px-4 text-sm font-black transition disabled:opacity-60 ${classes.button}`}
                >
                  {notice.buttonText || "Ver agora"}
                </button>
              ) : null}
            </div>

            {notice.dismissible ? (
              <button
                type="button"
                onClick={dismiss}
                disabled={busy}
                aria-label="Fechar aviso"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-zinc-200 transition hover:bg-white/15 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-md"
      role={notice.blocking ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby={`client-notice-title-${notice.id}`}
      aria-describedby={`client-notice-body-${notice.id}`}
    >
      <section className={`w-full max-w-md overflow-hidden rounded-[30px] border ${classes.border} bg-zinc-950 text-white shadow-2xl`}>
        {notice.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={notice.imageUrl}
            alt=""
            className="max-h-52 w-full object-cover"
          />
        ) : null}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${classes.chip}`}>
              <Icon size={24} />
            </div>

            {notice.dismissible ? (
              <button
                type="button"
                onClick={dismiss}
                disabled={busy}
                aria-label="Fechar aviso"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-zinc-200 transition hover:bg-white/15 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
                <BellRing size={13} />
                Aviso importante
              </div>
            )}
          </div>

          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
            SalãoPremium
          </div>
          <h2
            id={`client-notice-title-${notice.id}`}
            className="mt-2 text-2xl font-black tracking-[-0.04em]"
          >
            {notice.title}
          </h2>
          <p
            id={`client-notice-body-${notice.id}`}
            className="mt-3 text-sm leading-6 text-zinc-300"
          >
            {notice.body}
          </p>

          {notice.blocking ? (
            <p className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-xs font-semibold leading-5 text-zinc-400">
              Este aviso foi definido pelo Admin Master como obrigatório. O app
              será liberado automaticamente quando o período terminar ou quando
              o administrador encerrar a mensagem.
            </p>
          ) : null}

          {notice.url ? (
            <button
              type="button"
              onClick={openLink}
              disabled={busy}
              className={`mt-5 min-h-12 w-full rounded-2xl px-5 text-sm font-black transition disabled:opacity-60 ${classes.button}`}
            >
              {notice.buttonText || "Ver agora"}
            </button>
          ) : null}

          {!notice.url && notice.dismissible ? (
            <button
              type="button"
              onClick={dismiss}
              disabled={busy}
              className="mt-5 min-h-12 w-full rounded-2xl bg-white px-5 text-sm font-black text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-60"
            >
              Entendi
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
