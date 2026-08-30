"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

type SecondFactor = {
  strategy?: string;
  emailAddressId?: string;
  phoneNumberId?: string;
};

type ClerkSessionLike = {
  getToken: () => Promise<string | null>;
};

type ClerkSignInAttempt = {
  status?: string;
  createdSessionId?: string | null;
  supportedSecondFactors?: SecondFactor[];
};

type ClerkSignInLike = {
  create: (params: { identifier: string; password?: string }) => Promise<ClerkSignInAttempt>;
  attemptFirstFactor: (params: { strategy: "password"; password: string }) => Promise<ClerkSignInAttempt>;
  prepareSecondFactor?: (params:
    | { strategy: "email_code"; emailAddressId: string }
    | { strategy: "phone_code"; phoneNumberId: string }
  ) => Promise<ClerkSignInAttempt>;
  attemptSecondFactor: (params:
    | { strategy: "totp" | "backup_code"; code: string }
    | { strategy: "email_code" | "phone_code"; code: string }
  ) => Promise<ClerkSignInAttempt>;
  authenticateWithRedirect: (params: {
    strategy: "oauth_google";
    redirectUrl: string;
    redirectUrlComplete: string;
  }) => Promise<void>;
};

type ClerkLike = {
  load: (options?: Record<string, unknown>) => Promise<void>;
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

type FirstAccessPayload = { ok?: boolean; message?: string };

type VerificationMode = "totp" | "backup_code" | "device_email" | "device_phone";

function authenticationDomain(publishableKey: string) {
  const encoded = publishableKey.split("_")[2] || "";
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return window.atob(padded).replace(/\$$/, "").trim();
}

function loadAuthenticationScript(src: string, publishableKey: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if ((window as ClerkWindow).Clerk) resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-clerk-publishable-key", publishableKey);
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Falha ao carregar a autenticação.")), { once: true });
    document.head.appendChild(script);
  });
}

function readableAuthError(cause: unknown) {
  const response = cause as {
    errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
  };
  const first = response?.errors?.[0];
  const code = String(first?.code || "").toLowerCase();
  const raw = `${first?.longMessage || ""} ${first?.message || ""}`;

  if (code.includes("password_incorrect") || /incorrect password|senha incorreta/i.test(raw)) {
    return "A senha informada está incorreta.";
  }
  if (code.includes("identifier_not_found") || /not found|não encontrad|nao encontrad/i.test(raw)) {
    return "Este e-mail ainda não possui um acesso cadastrado.";
  }
  if (code.includes("too_many") || /too many|rate|locked|tentativas/i.test(raw)) {
    return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
  }
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
  const exchangeInFlightRef = useRef(false);
  const authenticationCompletedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMode, setVerificationMode] = useState<VerificationMode>("totp");
  const [step, setStep] = useState<"password" | "verification">("password");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("Carregando autenticação segura...");
  const [error, setError] = useState("");
  const [firstAccessEmail, setFirstAccessEmail] = useState("");
  const [firstAccessLoading, setFirstAccessLoading] = useState(false);
  const [firstAccessMessage, setFirstAccessMessage] = useState("");

  async function exchangeSession(session?: ClerkSessionLike | null) {
    if (!session || authenticationCompletedRef.current || exchangeInFlightRef.current) return;

    exchangeInFlightRef.current = true;
    setStatus("Validando acesso administrativo...");
    setError("");

    try {
      const token = await session.getToken();
      if (!token) throw new Error("A autenticação não retornou uma sessão válida.");
      if (authenticationCompletedRef.current || exchangedTokenRef.current === token) return;
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
        authenticationCompletedRef.current = true;
        window.location.assign(payload.redirectTo);
        return;
      }

      if (!response.ok || !payload?.ok) {
        exchangedTokenRef.current = null;
        throw new Error(payload?.message || "Não foi possível liberar seu acesso.");
      }

      // Marca como concluído antes de navegar. O setActive() do Clerk pode
      // disparar listener mais de uma vez; sem esta trava o primeiro POST 200
      // era seguido por novos POSTs 401 e a tela mostrava erro mesmo após sucesso.
      authenticationCompletedRef.current = true;
      setStatus("Acesso confirmado. Abrindo o sistema...");
      onAuthenticated(payload.redirectTo || nextPath);
    } catch (cause) {
      if (authenticationCompletedRef.current) return;
      exchangedTokenRef.current = null;
      setError(cause instanceof Error ? cause.message : "Falha ao validar sua sessão.");
      setStatus("");
    } finally {
      exchangeInFlightRef.current = false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function setup() {
      const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
      if (!publishableKey) throw new Error("O acesso seguro não está configurado.");

      const domain = authenticationDomain(publishableKey);
      await loadAuthenticationScript(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, publishableKey);
      const clerk = (window as ClerkWindow).Clerk;
      if (!clerk) throw new Error("A autenticação segura não foi carregada.");
      await clerk.load();
      if (cancelled) return;

      clerkRef.current = clerk;

      const motivo = new URLSearchParams(window.location.search).get("motivo");
      if (motivo === "logout") {
        await fetch("/api/auth/painel/logout", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        }).catch(() => undefined);
        await clerk.signOut?.().catch(() => undefined);
        if (cancelled) return;
      }

      setReady(true);
      setStatus("");
      if (clerk.addListener) {
        unsubscribe = clerk.addListener(({ session }) => {
          if (!authenticationCompletedRef.current) void exchangeSession(session || null);
        });
      }
      if (clerk.session && motivo !== "logout" && !authenticationCompletedRef.current) {
        await exchangeSession(clerk.session);
      }
    }

    void setup().catch((cause) => {
      if (cancelled || authenticationCompletedRef.current) return;
      setError(cause instanceof Error ? cause.message : "Falha ao iniciar autenticação.");
      setStatus("");
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [exchangeEndpoint, nextPath, onAuthenticated]);

  async function beginDeviceTrust(attempt: ClerkSignInAttempt) {
    const signIn = clerkRef.current?.client?.signIn;
    if (!signIn?.prepareSecondFactor) {
      throw new Error("A verificação deste dispositivo não está disponível nesta versão do login.");
    }

    const factors = attempt.supportedSecondFactors || [];
    const emailFactor = factors.find((factor) => factor.strategy === "email_code" && factor.emailAddressId);
    if (emailFactor?.emailAddressId) {
      await signIn.prepareSecondFactor({ strategy: "email_code", emailAddressId: emailFactor.emailAddressId });
      setVerificationMode("device_email");
      setStep("verification");
      setStatus("Enviamos um código para seu e-mail. Digite-o para confiar neste dispositivo.");
      return;
    }

    const phoneFactor = factors.find((factor) => factor.strategy === "phone_code" && factor.phoneNumberId);
    if (phoneFactor?.phoneNumberId) {
      await signIn.prepareSecondFactor({ strategy: "phone_code", phoneNumberId: phoneFactor.phoneNumberId });
      setVerificationMode("device_phone");
      setStep("verification");
      setStatus("Enviamos um código para seu telefone. Digite-o para confiar neste dispositivo.");
      return;
    }

    throw new Error("O Clerk exigiu verificação do dispositivo, mas não informou e-mail ou telefone para receber o código.");
  }

  async function finishSignIn(attempt: ClerkSignInAttempt) {
    if (attempt.status === "complete" && attempt.createdSessionId && clerkRef.current) {
      authenticationCompletedRef.current = false;
      exchangedTokenRef.current = null;
      await clerkRef.current.setActive({ session: attempt.createdSessionId });
      setStatus("Acesso confirmado. Abrindo o sistema...");
      return;
    }

    if (attempt.status === "needs_client_trust") {
      await beginDeviceTrust(attempt);
      return;
    }

    if (attempt.status === "needs_second_factor") {
      setVerificationMode("totp");
      setStep("verification");
      setStatus("Digite o código do seu aplicativo autenticador.");
      return;
    }

    throw new Error(`Não foi possível concluir o acesso (etapa: ${attempt.status || "desconhecida"}).`);
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const signIn = clerkRef.current?.client?.signIn;
    if (!ready || !signIn || submitting) return;

    authenticationCompletedRef.current = false;
    exchangedTokenRef.current = null;
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
      setError(cause instanceof Error && cause.message.includes("etapa:") ? cause.message : readableAuthError(cause));
      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const signIn = clerkRef.current?.client?.signIn;
    if (!ready || !signIn || submitting) return;

    authenticationCompletedRef.current = false;
    exchangedTokenRef.current = null;
    setSubmitting(true);
    setError("");
    setStatus("Verificando o código...");
    try {
      const strategy =
        verificationMode === "device_email"
          ? "email_code"
          : verificationMode === "device_phone"
            ? "phone_code"
            : verificationMode;
      const attempt = await signIn.attemptSecondFactor({ strategy, code: verificationCode.trim() } as never);
      await finishSignIn(attempt);
    } catch (cause) {
      setError(readableAuthError(cause) || "Código inválido. Confira e tente novamente.");
      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendDeviceTrustCode() {
    const signIn = clerkRef.current?.client?.signIn;
    if (!signIn?.prepareSecondFactor || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const current = signIn as unknown as ClerkSignInAttempt;
      const factors = current.supportedSecondFactors || [];
      if (verificationMode === "device_email") {
        const factor = factors.find((item) => item.strategy === "email_code" && item.emailAddressId);
        if (!factor?.emailAddressId) throw new Error("Não foi possível localizar seu e-mail para reenviar o código.");
        await signIn.prepareSecondFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      } else if (verificationMode === "device_phone") {
        const factor = factors.find((item) => item.strategy === "phone_code" && item.phoneNumberId);
        if (!factor?.phoneNumberId) throw new Error("Não foi possível localizar seu telefone para reenviar o código.");
        await signIn.prepareSecondFactor({ strategy: "phone_code", phoneNumberId: factor.phoneNumberId });
      }
      setStatus("Novo código enviado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível reenviar o código.");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestFirstAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!migrationEndpoint || firstAccessLoading) return;
    setFirstAccessLoading(true);
    setFirstAccessMessage("");
    try {
      const response = await fetch(migrationEndpoint, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: firstAccessEmail.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as FirstAccessPayload | null;
      setFirstAccessMessage(payload?.message || "Se a conta estiver ativa, você receberá as instruções por e-mail.");
    } finally {
      setFirstAccessLoading(false);
    }
  }

  const isDeviceTrust = verificationMode === "device_email" || verificationMode === "device_phone";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
        <span className="inline-flex items-center gap-2"><ShieldCheck size={17} /> Acesso protegido</span>
      </div>

      {migrationEndpoint && step === "password" ? (
        <form onSubmit={requestFirstAccess} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm"><Mail size={18} /></div>
            <div>
              <h3 className="font-black text-zinc-950">É seu primeiro acesso?</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-600">Informe o e-mail administrativo já cadastrado. Se a conta precisar de migração, enviaremos um convite seguro.</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <input type="email" required value={firstAccessEmail} onChange={(e) => setFirstAccessEmail(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none" placeholder="voce@exemplo.com" />
            <button disabled={firstAccessLoading} className="rounded-xl bg-zinc-950 px-4 text-sm font-black text-white disabled:opacity-60">{firstAccessLoading ? "Enviando..." : "Enviar convite"}</button>
          </div>
          {firstAccessMessage ? <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">{firstAccessMessage}</p> : null}
        </form>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {status ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{status}</div> : null}

      {step === "password" ? (
        <form onSubmit={submitPassword} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
          <label className="block text-sm font-black text-zinc-900">E-mail
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200 px-3"><Mail size={17} className="text-zinc-400" /><input type="email" required autoComplete="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-12 w-full outline-none" /></div>
          </label>
          <label className="block text-sm font-black text-zinc-900">Senha
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200 px-3"><LockKeyhole size={17} className="text-zinc-400" /><input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 min-w-0 flex-1 outline-none" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </label>
          <button disabled={!ready || submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 font-black text-white disabled:opacity-60">{submitting ? <Loader2 size={18} className="animate-spin" /> : null}{submitting ? "Entrando..." : "Entrar"}</button>
        </form>
      ) : (
        <form onSubmit={submitVerification} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
          <div>
            <h3 className="text-lg font-black text-zinc-950">{isDeviceTrust ? "Confirmar este dispositivo" : "Verificação em duas etapas"}</h3>
            <p className="mt-1 text-sm text-zinc-600">{isDeviceTrust ? "Digite o código enviado pelo Clerk para autorizar este navegador." : verificationMode === "backup_code" ? "Digite um código de recuperação." : "Digite o código do seu aplicativo autenticador."}</p>
          </div>
          <input inputMode="numeric" autoComplete="one-time-code" required value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-center text-lg font-black tracking-[0.2em] outline-none" placeholder="000000" />
          <button disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 font-black text-white disabled:opacity-60">{submitting ? <Loader2 size={18} className="animate-spin" /> : null}Confirmar código</button>
          {isDeviceTrust ? <button type="button" disabled={submitting} onClick={() => void resendDeviceTrustCode()} className="h-11 w-full rounded-xl border border-zinc-200 bg-white text-sm font-bold">Reenviar código</button> : <button type="button" onClick={() => setVerificationMode((mode) => mode === "backup_code" ? "totp" : "backup_code")} className="h-11 w-full rounded-xl border border-zinc-200 bg-white text-sm font-bold">{verificationMode === "backup_code" ? "Usar aplicativo autenticador" : "Usar código de recuperação"}</button>}
          <button type="button" onClick={() => { setStep("password"); setVerificationCode(""); setError(""); setStatus(""); }} className="h-10 w-full text-sm font-semibold text-zinc-600">Voltar ao login</button>
        </form>
      )}
    </div>
  );
}