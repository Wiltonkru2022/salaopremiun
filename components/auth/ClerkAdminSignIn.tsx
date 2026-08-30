"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

type ClerkSessionLike = { getToken: () => Promise<string | null> };
type ClerkSignInAttempt = { status?: string; createdSessionId?: string | null };
type ClerkSignInLike = {
  create: (params: { identifier: string; password?: string }) => Promise<ClerkSignInAttempt>;
  attemptFirstFactor: (params: { strategy: "password"; password: string }) => Promise<ClerkSignInAttempt>;
  attemptSecondFactor: (params: { strategy: "totp" | "backup_code"; code: string }) => Promise<ClerkSignInAttempt>;
  authenticateWithRedirect: (params: { strategy: "oauth_google"; redirectUrl: string; redirectUrlComplete: string }) => Promise<void>;
};
type ClerkLike = {
  load: () => Promise<void>;
  session?: ClerkSessionLike | null;
  client?: { signIn?: ClerkSignInLike };
  setActive: (params: { session: string }) => Promise<void>;
  signOut?: () => Promise<void>;
  addListener?: (listener: (resources: { session?: ClerkSessionLike | null }) => void) => () => void;
};
type ClerkWindow = Window & typeof globalThis & { Clerk?: ClerkLike };

type ExchangePayload = {
  ok?: boolean;
  message?: string;
  redirectTo?: string;
  mfaRequired?: boolean;
  mfaEnrollmentRequired?: boolean;
};

type MigrationPayload = { ok?: boolean; message?: string };

function clerkDomain(key: string) {
  const encoded = key.split("_")[2] || "";
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return window.atob(padded).replace(/\$$/, "").trim();
}

function loadClerkScript(src: string, key: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if ((window as ClerkWindow).Clerk) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar a autenticação.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-clerk-publishable-key", key);
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Falha ao carregar a autenticação.")), { once: true });
    document.head.appendChild(script);
  });
}

function authError(cause: unknown) {
  const value = cause as { errors?: Array<{ code?: string; message?: string; longMessage?: string }> };
  const first = value?.errors?.[0];
  const code = String(first?.code || "").toLowerCase();
  const raw = `${first?.message || ""} ${first?.longMessage || ""}`.toLowerCase();
  if (code.includes("password_incorrect") || raw.includes("incorrect password")) return "A senha informada está incorreta.";
  if (code.includes("identifier_not_found") || raw.includes("not found")) return "Este e-mail ainda não possui um acesso cadastrado.";
  if (code.includes("too_many") || raw.includes("too many") || raw.includes("locked")) return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
  if (cause instanceof Error && process.env.NODE_ENV === "development") return cause.message;
  return "Não foi possível entrar agora. Confira os dados e tente novamente.";
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
  const clerkRef = useRef<ClerkLike | null>(null);
  const exchangedTokenRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [step, setStep] = useState<"password" | "verification">("password");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("Carregando autenticação segura...");
  const [error, setError] = useState("");
  const [firstAccessEmail, setFirstAccessEmail] = useState("");
  const [firstAccessLoading, setFirstAccessLoading] = useState(false);
  const [firstAccessMessage, setFirstAccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function exchangeSession(session?: ClerkSessionLike | null) {
      if (!session || cancelled) return;
      try {
        setStatus("Validando acesso e segundo fator...");
        setError("");
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
        const payload = (await response.json().catch(() => null)) as ExchangePayload | null;
        if (payload?.mfaEnrollmentRequired && payload.redirectTo) {
          window.location.assign(payload.redirectTo);
          return;
        }
        if (!response.ok || !payload?.ok) {
          exchangedTokenRef.current = null;
          throw new Error(payload?.message || (payload?.mfaRequired ? "Conclua o segundo fator para continuar." : "Não foi possível liberar seu acesso."));
        }
        setStatus("Acesso confirmado. Abrindo o sistema...");
        onAuthenticated(payload.redirectTo || nextPath);
      } catch (cause) {
        if (cancelled) return;
        exchangedTokenRef.current = null;
        setError(cause instanceof Error ? cause.message : "Falha ao validar sua sessão.");
        setStatus("");
      }
    }

    async function setup() {
      const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
      if (!key) throw new Error("O acesso seguro não está configurado.");
      const src = `https://${clerkDomain(key)}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`;
      await loadClerkScript(src, key);
      const clerk = (window as ClerkWindow).Clerk;
      if (!clerk) throw new Error("A autenticação segura não foi carregada.");
      await clerk.load();
      if (cancelled) return;
      clerkRef.current = clerk;

      const motivo = new URLSearchParams(window.location.search).get("motivo");
      if (motivo === "logout") {
        await fetch("/api/auth/painel/logout", { method: "POST", cache: "no-store", credentials: "same-origin" }).catch(() => undefined);
        if (clerk.signOut) await clerk.signOut();
        if (cancelled) return;
        exchangedTokenRef.current = null;
        setReady(true);
        setStatus("");
        return;
      }

      setReady(true);
      setStatus("");
      if (clerk.addListener) unsubscribe = clerk.addListener(({ session }) => void exchangeSession(session || null));
      if (clerk.session) await exchangeSession(clerk.session);
    }

    void setup().catch((cause) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : "Falha ao iniciar autenticação.");
      setStatus("");
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [exchangeEndpoint, nextPath, onAuthenticated]);

  async function finishSignIn(attempt: ClerkSignInAttempt) {
    if (attempt.status === "complete" && attempt.createdSessionId && clerkRef.current) {
      await clerkRef.current.setActive({ session: attempt.createdSessionId });
      setStatus("Acesso confirmado. Abrindo o sistema...");
      return;
    }
    if (attempt.status === "needs_second_factor") {
      setStep("verification");
      setStatus("Digite o código do seu aplicativo autenticador.");
      return;
    }
    throw new Error("Não foi possível concluir o acesso. Verifique seus dados e tente novamente.");
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const signIn = clerkRef.current?.client?.signIn;
    if (!ready || !signIn || submitting) return;
    setSubmitting(true);
    setError("");
    setStatus("Confirmando seu acesso...");
    try {
      let attempt = await signIn.create({ identifier: identifier.trim(), password });
      if (attempt.status === "needs_first_factor") {
        attempt = await signIn.attemptFirstFactor({ strategy: "password", password });
      }
      await finishSignIn(attempt);
    } catch (cause) {
      setError(authError(cause));
      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const signIn = clerkRef.current?.client?.signIn;
    if (!ready || !signIn || submitting) return;
    setSubmitting(true);
    setError("");
    setStatus("Verificando o código...");
    try {
      const attempt = await signIn.attemptSecondFactor({
        strategy: useBackupCode ? "backup_code" : "totp",
        code: verificationCode.trim(),
      });
      await finishSignIn(attempt);
    } catch {
      setError("Código inválido. Confira e tente novamente.");
      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

  async function migrateFirstAccess() {
    if (!migrationEndpoint || !firstAccessEmail.trim() || firstAccessLoading) return;
    setFirstAccessLoading(true);
    setFirstAccessMessage("");
    try {
      const response = await fetch(migrationEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: firstAccessEmail.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as MigrationPayload | null;
      setFirstAccessMessage(payload?.message || (response.ok ? "Solicitação concluída." : "Não foi possível concluir o primeiro acesso."));
    } catch {
      setFirstAccessMessage("Não foi possível concluir o primeiro acesso agora.");
    } finally {
      setFirstAccessLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {status ? <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-600"><Loader2 size={16} className="animate-spin" />{status}</div> : null}

      {step === "password" ? (
        <form onSubmit={submitPassword} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-zinc-800">E-mail</span>
            <span className="flex items-center gap-3 rounded-2xl border border-zinc-300 px-4 py-3.5 focus-within:border-zinc-950">
              <Mail size={18} className="text-zinc-400" />
              <input type="email" autoComplete="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" placeholder="voce@exemplo.com" required />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-zinc-800">Senha</span>
            <span className="flex items-center gap-3 rounded-2xl border border-zinc-300 px-4 py-3.5 focus-within:border-zinc-950">
              <LockKeyhole size={18} className="text-zinc-400" />
              <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-zinc-500" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
          </label>
          <button type="submit" disabled={!ready || submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3.5 text-sm font-black text-white disabled:opacity-60">
            {submitting ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />} Entrar com segurança
          </button>
        </form>
      ) : (
        <form onSubmit={submitVerification} className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Sua conta exige verificação em duas etapas.</div>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-zinc-800">{useBackupCode ? "Código de recuperação" : "Código do autenticador"}</span>
            <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} autoComplete="one-time-code" className="w-full rounded-2xl border border-zinc-300 px-4 py-3.5 text-center text-lg font-black tracking-[0.2em] outline-none focus:border-zinc-950" required />
          </label>
          <button type="button" onClick={() => setUseBackupCode((value) => !value)} className="text-sm font-bold text-zinc-600 underline">{useBackupCode ? "Usar autenticador" : "Usar código de recuperação"}</button>
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3.5 text-sm font-black text-white disabled:opacity-60">{submitting ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />} Confirmar código</button>
        </form>
      )}

      {migrationEndpoint ? (
        <div className="border-t border-zinc-200 pt-5">
          <p className="text-sm font-black text-zinc-800">Primeiro acesso / migração</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Se sua conta ainda não estiver no novo acesso seguro, informe o e-mail cadastrado.</p>
          <div className="mt-3 flex gap-2">
            <input type="email" value={firstAccessEmail} onChange={(event) => setFirstAccessEmail(event.target.value)} placeholder="seu e-mail" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-950" />
            <button type="button" disabled={firstAccessLoading} onClick={() => void migrateFirstAccess()} className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-black disabled:opacity-60">{firstAccessLoading ? "Enviando..." : "Liberar"}</button>
          </div>
          {firstAccessMessage ? <p className="mt-2 text-xs font-semibold text-zinc-600">{firstAccessMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
