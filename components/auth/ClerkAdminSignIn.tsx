"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

type ClerkSessionLike = { getToken: () => Promise<string | null> };
type ClerkSignInAttempt = { status?: string; createdSessionId?: string | null };
type ClerkLike = {
  load: (options?: Record<string, unknown>) => Promise<void>;
  session?: ClerkSessionLike | null;
  client?: { signIn?: { create?: (params: Record<string, unknown>) => Promise<ClerkSignInAttempt> } };
  setActive?: (params: { session: string }) => Promise<void>;
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

function decodeClerkDomain(publishableKey: string) {
  const encoded = publishableKey.split("_")[2] || "";
  if (!encoded) throw new Error("Publishable Key do Clerk inválida.");
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const decoded = window.atob(padded).replace(/\$$/, "").trim();
  if (!decoded || !decoded.includes(".")) throw new Error("Não foi possível resolver o domínio do Clerk.");
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
    script.addEventListener("load", () => { script.dataset.loaded = "1"; resolve(); }, { once: true });
    script.addEventListener("error", () => reject(new Error("Falha ao carregar autenticação segura.")), { once: true });
    document.head.appendChild(script);
  });
}

export function ClerkAdminSignIn({ exchangeEndpoint, migrationEndpoint, nextPath, onAuthenticated }: {
  exchangeEndpoint: string;
  migrationEndpoint?: string;
  nextPath: string;
  onAuthenticated: (redirectTo: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const exchangedTokenRef = useRef<string | null>(null);
  const exchangeSessionRef = useRef<(session?: ClerkSessionLike | null) => Promise<void>>(async () => undefined);
  const [status, setStatus] = useState("Carregando autenticação segura...");
  const [error, setError] = useState("");
  const [legacyEmail, setLegacyEmail] = useState("");
  const [legacyPassword, setLegacyPassword] = useState("");
  const [migrating, setMigrating] = useState(false);

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
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ next: nextPath }),
        });
        const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; redirectTo?: string; mfaRequired?: boolean } | null;
        if (!response.ok || !payload?.ok) {
          exchangedTokenRef.current = null;
          throw new Error(payload?.message || (payload?.mfaRequired ? "Conclua o segundo fator para continuar." : "Não foi possível liberar seu acesso."));
        }
        setStatus("Acesso confirmado. Abrindo o sistema...");
        onAuthenticated(payload.redirectTo || nextPath);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Falha ao validar sua sessão.");
        setStatus("");
      }
    }

    exchangeSessionRef.current = exchangeSession;

    async function setup() {
      const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
      if (!publishableKey) throw new Error("Autenticação Clerk não configurada.");
      const clerkDomain = decodeClerkDomain(publishableKey);
      await loadExternalScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
      await loadExternalScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, { "data-clerk-publishable-key": publishableKey });
      if (!window.Clerk || !window.__internal_ClerkUICtor) throw new Error("Não foi possível iniciar a autenticação.");
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
            formFieldInput: "h-12 rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-none focus:border-zinc-950",
            formButtonPrimary: "h-12 rounded-2xl bg-zinc-950 text-sm font-black text-white shadow-none hover:bg-zinc-800",
            socialButtonsBlockButton: "h-12 rounded-2xl border border-zinc-200 bg-white font-bold text-zinc-800 shadow-none hover:bg-zinc-50",
            dividerLine: "bg-zinc-200",
            dividerText: "text-xs font-bold uppercase tracking-wider text-zinc-400",
            identityPreview: "rounded-2xl border border-zinc-200 bg-zinc-50",
            alert: "rounded-2xl border border-rose-200 bg-rose-50 text-rose-700",
          },
        },
      });

      if (window.Clerk.addListener) unsubscribe = window.Clerk.addListener(({ session }) => { void exchangeSession(session || null); });
      if (window.Clerk.session) await exchangeSession(window.Clerk.session); else setStatus("");
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

  async function migrateLegacyAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!migrationEndpoint || migrating) return;
    setMigrating(true);
    setError("");
    setStatus("Migrando seu acesso com segurança...");
    try {
      const response = await fetch(migrationEndpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: legacyEmail.trim().toLowerCase(), password: legacyPassword, next: nextPath }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; ticket?: string; redirectTo?: string } | null;
      if (!response.ok || !payload?.ok || !payload.ticket) throw new Error(payload?.message || "Não foi possível migrar seu acesso.");
      const clerk = window.Clerk;
      const create = clerk?.client?.signIn?.create;
      if (!clerk || !create || !clerk.setActive) throw new Error("A autenticação ainda está carregando. Tente novamente.");
      const attempt = await create({ strategy: "ticket", ticket: payload.ticket });
      if (attempt.status !== "complete" || !attempt.createdSessionId) throw new Error("Conta migrada. Conclua a etapa de segurança abaixo para entrar.");
      await clerk.setActive({ session: attempt.createdSessionId });
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      if (clerk.session) await exchangeSessionRef.current(clerk.session); else window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao migrar acesso.");
      setStatus("");
    } finally {
      setMigrating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        <ShieldCheck size={17} /> Acesso protegido com MFA
      </div>

      {migrationEndpoint ? (
        <form onSubmit={migrateLegacyAccess} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
          <p className="text-base font-black text-zinc-950">Primeiro acesso após a atualização?</p>
          <p className="mt-1 text-sm leading-5 text-zinc-600">Entre uma única vez com seu e-mail e senha antigos. O sistema migra sua conta automaticamente.</p>
          <div className="mt-4 grid gap-3">
            <input type="email" autoComplete="email" value={legacyEmail} onChange={(event) => setLegacyEmail(event.target.value)} placeholder="Seu e-mail" required className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-950" />
            <input type="password" autoComplete="current-password" value={legacyPassword} onChange={(event) => setLegacyPassword(event.target.value)} placeholder="Sua senha atual" required className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-950" />
            <button type="submit" disabled={migrating} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white disabled:opacity-60">
              {migrating ? <Loader2 size={16} className="animate-spin" /> : null}
              Migrar acesso e entrar
            </button>
          </div>
        </form>
      ) : null}

      {status ? <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600"><Loader2 size={16} className="animate-spin" />{status}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      <div className="pt-1">
        <div className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-400"><span className="h-px flex-1 bg-zinc-200" /><span>Já migrou sua conta?</span><span className="h-px flex-1 bg-zinc-200" /></div>
        <div ref={hostRef} className="min-h-[300px]" />
      </div>
    </div>
  );
}
