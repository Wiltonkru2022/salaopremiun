"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

type ClerkSessionLike = { getToken: () => Promise<string | null> };
type ClerkLike = {
  load: (options?: Record<string, unknown>) => Promise<void>;
  session?: ClerkSessionLike | null;
  mountSignIn: (element: HTMLDivElement, options?: Record<string, unknown>) => void;
  unmountSignIn?: (element: HTMLDivElement) => void;
  addListener?: (listener: (resources: { session?: ClerkSessionLike | null }) => void) => () => void;
};

declare global {
  interface Window {
    Clerk?: ClerkLike;
    __internal_ClerkUICtor?: unknown;
  }
}

type ExchangePayload = {
  ok?: boolean;
  message?: string;
  redirectTo?: string;
  mfaRequired?: boolean;
  mfaEnrollmentRequired?: boolean;
};

type FirstAccessPayload = {
  ok?: boolean;
  message?: string;
};

function decodeClerkDomain(publishableKey: string) {
  const encoded = publishableKey.split("_")[2] || "";
  if (!encoded) throw new Error("Publishable Key do Clerk inválida.");
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const decoded = window.atob(padded).replace(/\$$/, "").trim();
  if (!decoded || !decoded.includes(".")) {
    throw new Error("Não foi possível resolver o domínio do Clerk.");
  }
  return decoded;
}

function loadExternalScript(src: string, attrs?: Record<string, string>) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    Object.entries(attrs || {}).forEach(([key, value]) => script.setAttribute(key, value));
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "1";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => reject(new Error("Falha ao carregar autenticação segura.")),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

export function ClerkAdminSignIn({
  exchangeEndpoint,
  migrationEndpoint,
  nextPath,
  onAuthenticated,
}: {
  exchangeEndpoint: string;
  migrationEndpoint?: string;
  nextPath: string;
  onAuthenticated: (redirectTo: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const exchangedTokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState("Carregando autenticação segura...");
  const [error, setError] = useState("");
  const [firstAccessEmail, setFirstAccessEmail] = useState("");
  const [firstAccessLoading, setFirstAccessLoading] = useState(false);
  const [firstAccessMessage, setFirstAccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const host = hostRef.current;

    async function exchangeSession(session?: ClerkSessionLike | null) {
      if (!session || cancelled) return;
      setStatus("Validando acesso e segundo fator...");
      setError("");

      try {
        const token = await session.getToken();
        if (!token) throw new Error("A autenticação não retornou uma sessão válida.");
        if (exchangedTokenRef.current === token) return;
        exchangedTokenRef.current = token;

        const response = await fetch(exchangeEndpoint, {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ next: nextPath }),
        });
        const payload = (await response.json().catch(() => null)) as ExchangePayload | null;

        if (payload?.mfaEnrollmentRequired && payload.redirectTo) {
          setStatus("MFA obrigatório. Abrindo a configuração segura do Clerk...");
          window.location.assign(payload.redirectTo);
          return;
        }

        if (!response.ok || !payload?.ok) {
          exchangedTokenRef.current = null;
          throw new Error(
            payload?.message ||
              (payload?.mfaRequired
                ? "Conclua o segundo fator para continuar."
                : "Não foi possível liberar seu acesso.")
          );
        }

        setStatus("Acesso confirmado. Abrindo o sistema...");
        onAuthenticated(payload.redirectTo || nextPath);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Falha ao validar sua sessão.");
        setStatus("");
      }
    }

    async function setup() {
      const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
      if (!publishableKey) throw new Error("Autenticação Clerk não configurada.");

      const clerkDomain = decodeClerkDomain(publishableKey);
      await loadExternalScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
      await loadExternalScript(
        `https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
        { "data-clerk-publishable-key": publishableKey }
      );

      if (!window.Clerk || !window.__internal_ClerkUICtor) {
        throw new Error("Não foi possível iniciar a autenticação.");
      }

      await window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
      if (cancelled || !host) return;

      window.Clerk.mountSignIn(host, {
        routing: "hash",
        appearance: {
          variables: {
            colorPrimary: "#18120d",
            colorText: "#21170f",
            colorTextSecondary: "#73604a",
            colorBackground: "transparent",
            colorInputBackground: "#ffffff",
            colorInputText: "#21170f",
            borderRadius: "1rem",
            fontFamily: "inherit",
          },
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none",
            card: "w-full bg-transparent shadow-none border-0 p-0",
            header: "hidden",
            footer: "hidden",
            formFieldLabel: "text-sm font-bold text-zinc-800",
            formFieldInput:
              "h-12 rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-none focus:border-zinc-950",
            formButtonPrimary:
              "h-12 rounded-2xl bg-zinc-950 text-sm font-black text-white shadow-none hover:bg-zinc-800",
            socialButtonsBlockButton:
              "h-12 rounded-2xl border border-zinc-200 bg-white font-bold text-zinc-800 shadow-none hover:bg-zinc-50",
            dividerLine: "bg-zinc-200",
            dividerText: "text-xs font-bold uppercase tracking-wider text-zinc-400",
            identityPreview: "rounded-2xl border border-zinc-200 bg-zinc-50",
            alert: "rounded-2xl border border-rose-200 bg-rose-50 text-rose-700",
          },
        },
      });

      if (window.Clerk.addListener) {
        unsubscribe = window.Clerk.addListener(({ session }) => {
          void exchangeSession(session || null);
        });
      }

      if (window.Clerk.session) await exchangeSession(window.Clerk.session);
      else setStatus("");
    }

    void setup().catch((cause) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : "Falha ao iniciar autenticação.");
      setStatus("");
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (host && window.Clerk?.unmountSignIn) window.Clerk.unmountSignIn(host);
    };
  }, [exchangeEndpoint, nextPath, onAuthenticated]);

  async function requestFirstAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!migrationEndpoint || firstAccessLoading) return;

    const email = firstAccessEmail.trim().toLowerCase();
    if (!email) return;

    setFirstAccessLoading(true);
    setFirstAccessMessage("");
    setError("");
    try {
      const response = await fetch(migrationEndpoint, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => null)) as FirstAccessPayload | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Não foi possível solicitar o primeiro acesso.");
      }
      setFirstAccessMessage(
        payload.message ||
          "Se o e-mail estiver habilitado para migração, você receberá um convite seguro do Clerk."
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao solicitar o primeiro acesso."
      );
    } finally {
      setFirstAccessLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        <ShieldCheck size={17} /> Acesso protegido com MFA
      </div>

      {migrationEndpoint ? (
        <form
          onSubmit={requestFirstAccess}
          className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-sm">
              <Mail size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-zinc-950">
                Primeiro acesso depois da migração?
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-600">
                Informe o e-mail antigo. Se ele estiver ativo no Neon e ainda precisar migrar,
                o Clerk enviará um convite de acesso. Nenhuma senha antiga é enviada ou reutilizada.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              autoComplete="email"
              required
              value={firstAccessEmail}
              onChange={(event) => setFirstAccessEmail(event.target.value)}
              placeholder="seu@email.com"
              className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-950"
            />
            <button
              type="submit"
              disabled={firstAccessLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-black text-white disabled:opacity-60"
            >
              {firstAccessLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              Enviar convite
            </button>
          </div>
          {firstAccessMessage ? (
            <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold leading-5 text-sky-800">
              {firstAccessMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      {status ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          <Loader2 size={16} className="animate-spin" />
          {status}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div ref={hostRef} className="min-h-[300px]" />
    </div>
  );
}
