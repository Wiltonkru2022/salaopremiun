"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";

type ClerkSessionLike = { getToken: () => Promise<string | null> };
type ClerkSignInAttempt = {
  status?: string;
  createdSessionId?: string | null;
  supportedSecondFactors?: Array<{ strategy?: string }>;
  attemptSecondFactor?: (params: Record<string, unknown>) => Promise<ClerkSignInAttempt>;
};
type ClerkLike = {
  load: (options?: Record<string, unknown>) => Promise<void>;
  session?: ClerkSessionLike | null;
  client?: {
    signIn?: {
      create?: (params: Record<string, unknown>) => Promise<ClerkSignInAttempt>;
    };
  };
  setActive?: (params: { session: string }) => Promise<void>;
  addListener?: (listener: (resources: { session?: ClerkSessionLike | null }) => void) => () => void;
};

declare global {
  interface Window {
    Clerk?: ClerkLike;
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
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Falha ao carregar autenticação segura.")), { once: true });
    document.head.appendChild(script);
  });
}

function errorMessage(cause: unknown) {
  if (cause instanceof Error) return cause.message;
  if (cause && typeof cause === "object" && "errors" in cause) {
    const errors = (cause as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    const message = errors?.[0]?.longMessage || errors?.[0]?.message;
    if (message) return message;
  }
  return "Não foi possível entrar. Confira os dados e tente novamente.";
}

export function ClerkAdminSignIn({ exchangeEndpoint, migrationEndpoint, nextPath, onAuthenticated }: {
  exchangeEndpoint: string;
  migrationEndpoint?: string;
  nextPath: string;
  onAuthenticated: (redirectTo: string) => void;
}) {
  const exchangedTokenRef = useRef<string | null>(null);
  const exchangeSessionRef = useRef<(session?: ClerkSessionLike | null) => Promise<void>>(async () => undefined);
  const secondFactorAttemptRef = useRef<ClerkSignInAttempt | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Carregando autenticação segura...");
  const [error, setError] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [legacyEmail, setLegacyEmail] = useState("");
  const [legacyPassword, setLegacyPassword] = useState("");
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function exchangeSession(session?: ClerkSessionLike | null) {
      if (!session || cancelled) return;
      setStatus("Validando seu acesso...");
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
        setError(errorMessage(cause));
        setStatus("");
      }
    }

    exchangeSessionRef.current = exchangeSession;

    async function setup() {
      const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
      if (!publishableKey) throw new Error("Autenticação Clerk não configurada.");
      const clerkDomain = decodeClerkDomain(publishableKey);
      await loadExternalScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": publishableKey,
      });
      if (!window.Clerk) throw new Error("Não foi possível iniciar a autenticação.");
      await window.Clerk.load();
      if (cancelled) return;
      setReady(true);
      setStatus("");
      if (window.Clerk.addListener) {
        unsubscribe = window.Clerk.addListener(({ session }) => {
          void exchangeSession(session || null);
        });
      }
      if (window.Clerk.session) await exchangeSession(window.Clerk.session);
    }

    void setup().catch((cause) => {
      if (cancelled) return;
      setError(errorMessage(cause));
      setStatus("");
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [exchangeEndpoint, nextPath, onAuthenticated]);

  async function activateAttempt(attempt: ClerkSignInAttempt) {
    const clerk = window.Clerk;
    if (!clerk?.setActive || !attempt.createdSessionId) {
      throw new Error("A autenticação não criou uma sessão válida.");
    }
    await clerk.setActive({ session: attempt.createdSessionId });
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    if (clerk.session) await exchangeSessionRef.current(clerk.session);
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || submitting) return;
    setSubmitting(true);
    setError("");
    setStatus("Entrando...");
    try {
      const create = window.Clerk?.client?.signIn?.create;
      if (!create) throw new Error("A autenticação ainda está carregando.");
      const attempt = await create({
        identifier: identifier.trim().toLowerCase(),
        password,
        strategy: "password",
      });
      if (attempt.status === "complete") {
        await activateAttempt(attempt);
        return;
      }
      if (attempt.status === "needs_second_factor") {
        const hasTotp = attempt.supportedSecondFactors?.some((factor) => factor.strategy === "totp");
        if (!hasTotp || !attempt.attemptSecondFactor) {
          throw new Error("Sua conta exige um segundo fator que ainda não está disponível nesta tela.");
        }
        secondFactorAttemptRef.current = attempt;
        setNeedsTotp(true);
        setStatus("");
        return;
      }
      throw new Error("O acesso precisa de uma etapa adicional antes de continuar.");
    } catch (cause) {
      setError(errorMessage(cause));
      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const attempt = secondFactorAttemptRef.current;
    if (!attempt?.attemptSecondFactor) return;
    setSubmitting(true);
    setError("");
    setStatus("Confirmando código...");
    try {
      const result = await attempt.attemptSecondFactor({ strategy: "totp", code: totpCode.trim() });
      if (result.status !== "complete") throw new Error("Código não confirmado. Tente novamente.");
      await activateAttempt(result);
    } catch (cause) {
      setError(errorMessage(cause));
      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

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
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; ticket?: string } | null;
      if (!response.ok || !payload?.ok || !payload.ticket) throw new Error(payload?.message || "Não foi possível migrar seu acesso.");
      const create = window.Clerk?.client?.signIn?.create;
      if (!create) throw new Error("A autenticação ainda está carregando. Tente novamente.");
      const attempt = await create({ strategy: "ticket", ticket: payload.ticket });
      if (attempt.status !== "complete") throw new Error("Conta migrada. Conclua a etapa de segurança para entrar.");
      await activateAttempt(attempt);
    } catch (cause) {
      setError(errorMessage(cause));
      setStatus("");
    } finally {
      setMigrating(false);
    }
  }

  const inputClass = "h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        <ShieldCheck size={17} /> Login seguro integrado ao Salão Premiun
      </div>

      {migrationEndpoint ? (
        <form onSubmit={migrateLegacyAccess} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
          <p className="text-base font-black text-zinc-950">Primeiro acesso após a atualização?</p>
          <p className="mt-1 text-sm leading-5 text-zinc-600">Use seus dados antigos uma única vez. Depois disso sua conta fica no novo login.</p>
          <div className="mt-4 grid gap-3">
            <input type="email" autoComplete="email" value={legacyEmail} onChange={(event) => setLegacyEmail(event.target.value)} placeholder="Seu e-mail" required className={inputClass} />
            <input type="password" autoComplete="current-password" value={legacyPassword} onChange={(event) => setLegacyPassword(event.target.value)} placeholder="Sua senha atual" required className={inputClass} />
            <button type="submit" disabled={migrating} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white disabled:opacity-60">
              {migrating ? <Loader2 size={16} className="animate-spin" /> : null}
              Migrar acesso e entrar
            </button>
          </div>
        </form>
      ) : null}

      {status ? <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600"><Loader2 size={16} className="animate-spin" />{status}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      {!needsTotp ? (
        <form onSubmit={submitLogin} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-zinc-800">
            E-mail
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input type="email" autoComplete="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="seu@email.com" required className={`${inputClass} pl-11`} />
            </div>
          </label>
          <label className="grid gap-2 text-sm font-bold text-zinc-800">
            Senha
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" required className={`${inputClass} px-11`} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button type="submit" disabled={!ready || submitting} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800 disabled:opacity-60">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Entrar
          </button>
        </form>
      ) : (
        <form onSubmit={submitTotp} className="grid gap-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
          <div>
            <p className="text-base font-black text-zinc-950">Confirmação em duas etapas</p>
            <p className="mt-1 text-sm text-zinc-600">Digite o código de 6 dígitos do seu autenticador.</p>
          </div>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required className={`${inputClass} text-center text-lg tracking-[0.35em]`} />
          <button type="submit" disabled={submitting || totpCode.length !== 6} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white disabled:opacity-60">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Confirmar código
          </button>
          <button type="button" onClick={() => { setNeedsTotp(false); setTotpCode(""); secondFactorAttemptRef.current = null; }} className="text-sm font-bold text-zinc-600 hover:text-zinc-950">Voltar</button>
        </form>
      )}
    </div>
  );
}
