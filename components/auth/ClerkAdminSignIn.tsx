"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

type ClerkSessionLike = {
  getToken: () => Promise<string | null>;
};

type ClerkSignInAttempt = {
  status?: string;
  createdSessionId?: string | null;
};

type ClerkSignInLike = {
  create: (params: {
    identifier: string;
    password?: string;
  }) => Promise<ClerkSignInAttempt>;

  attemptFirstFactor: (params: {
    strategy: "password";
    password: string;
  }) => Promise<ClerkSignInAttempt>;

  attemptSecondFactor: (params: {
    strategy: "totp" | "backup_code";
    code: string;
  }) => Promise<ClerkSignInAttempt>;

  authenticateWithRedirect: (params: {
    strategy: "oauth_google";
    redirectUrl: string;
    redirectUrlComplete: string;
  }) => Promise<void>;
};

type ClerkLike = {
  load: (options?: Record<string, unknown>) => Promise<void>;
  session?: ClerkSessionLike | null;
  client?: {
    signIn?: ClerkSignInLike;
  };
  setActive: (params: { session: string }) => Promise<void>;
  signOut?: () => Promise<void>;
  handleRedirectCallback?: (
    params?: Record<string, unknown>
  ) => Promise<unknown>;
  addListener?: (
    listener: (resources: {
      session?: ClerkSessionLike | null;
    }) => void
  ) => () => void;
};

type ClerkWindow = Window &
  typeof globalThis & {
    Clerk?: ClerkLike;
  };

function authenticationDomain(publishableKey: string) {
  const encoded = publishableKey.split("_")[2] || "";
  const normalized = encoded
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized +
    "=".repeat(
      (4 - (normalized.length % 4 || 4)) % 4
    );

  return window
    .atob(padded)
    .replace(/\$$/, "")
    .trim();
}

function loadAuthenticationScript(
  src: string,
  publishableKey: string
) {
  return new Promise<void>((resolve, reject) => {
    const existing =
      document.querySelector<HTMLScriptElement>(
        `script[src="${src}"]`
      );

    if (existing) {
      if ((window as ClerkWindow).Clerk) {
        resolve();
      } else {
        existing.addEventListener(
          "load",
          () => resolve(),
          { once: true }
        );
      }

      return;
    }

    const script = document.createElement("script");

    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute(
      "data-clerk-publishable-key",
      publishableKey
    );

    script.addEventListener(
      "load",
      () => resolve(),
      { once: true }
    );

    script.addEventListener(
      "error",
      () =>
        reject(
          new Error(
            "Falha ao carregar a autenticação."
          )
        ),
      { once: true }
    );

    document.head.appendChild(script);
  });
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
  const exchangedTokenRef = useRef<string | null>(
    null
  );

  const [ready, setReady] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [verificationCode, setVerificationCode] =
    useState("");
  const [useBackupCode, setUseBackupCode] =
    useState(false);
  const [step, setStep] = useState<
    "password" | "verification"
  >("password");
  const [submitting, setSubmitting] =
    useState(false);
  const [status, setStatus] = useState(
    "Carregando autenticação segura..."
  );
  const [error, setError] = useState("");
  const [firstAccessEmail, setFirstAccessEmail] =
    useState("");
  const [
    firstAccessLoading,
    setFirstAccessLoading,
  ] = useState(false);
  const [
    firstAccessMessage,
    setFirstAccessMessage,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function exchangeSession(
      session?: ClerkSessionLike | null
    ) {
      if (!session || cancelled) return;

      setStatus(
        "Validando acesso e segundo fator..."
      );
      setError("");

      try {
        const token = await session.getToken();

        if (!token) {
          throw new Error(
            "A autenticação não retornou uma sessão válida."
          );
        }

        if (exchangedTokenRef.current === token) {
          return;
        }

        exchangedTokenRef.current = token;

        const response = await fetch(
          exchangeEndpoint,
          {
            method: "POST",
            cache: "no-store",
            credentials: "same-origin",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              next: nextPath,
            }),
          }
        );

        const payload = (await response
          .json()
          .catch(() => null)) as
          | ExchangePayload
          | null;

        if (
          payload?.mfaEnrollmentRequired &&
          payload.redirectTo
        ) {
          setStatus(
            "Verificação em duas etapas obrigatória. Abrindo a configuração segura..."
          );

          window.location.assign(
            payload.redirectTo
          );

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

        setStatus(
          "Acesso confirmado. Abrindo o sistema..."
        );

        onAuthenticated(
          payload.redirectTo || nextPath
        );
      } catch (cause) {
        if (cancelled) return;

        exchangedTokenRef.current = null;

        setError(
          cause instanceof Error
            ? cause.message
            : "Falha ao validar sua sessão."
        );

        setStatus("");
      }
    }

    async function setup() {
      const publishableKey =
        process.env
          .NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
          ?.trim();

      if (!publishableKey) {
        throw new Error(
          "O acesso seguro não está configurado."
        );
      }

      const domain =
        authenticationDomain(publishableKey);

      await loadAuthenticationScript(
        `https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
        publishableKey
      );

      const clerk = (window as ClerkWindow).Clerk;

      if (!clerk) {
        throw new Error(
          "A autenticação segura não foi carregada."
        );
      }

      await clerk.load();

      if (cancelled) return;

      clerkRef.current = clerk;

      /*
       * IMPORTANTE:
       * /login?motivo=logout significa que o usuário acabou de pedir
       * logout no painel.
       *
       * Antes, a página de login encontrava a sessão Clerk ainda ativa
       * e exchangeSession() recriava imediatamente a sessão interna,
       * mandando o usuário de volta ao dashboard.
       *
       * Agora o login encerra a sessão REAL do Clerk antes de registrar
       * listeners ou tentar trocar o token por uma sessão do painel.
       */
      const motivo =
        new URLSearchParams(
          window.location.search
        ).get("motivo");

      if (motivo === "logout") {
        setStatus("Encerrando sessão segura...");
        setError("");
        exchangedTokenRef.current = null;

        /*
         * Garante também que o cookie interno foi removido.
         * A operação é idempotente, então é seguro chamar novamente.
         */
        await fetch(
          "/api/auth/painel/logout",
          {
            method: "POST",
            cache: "no-store",
            credentials: "same-origin",
            headers: {
              "Cache-Control": "no-store",
            },
          }
        ).catch(() => undefined);

        if (clerk.signOut) {
          await clerk.signOut();
        }

        if (cancelled) return;

        exchangedTokenRef.current = null;
        setReady(true);
        setStatus("");

        /*
         * Não executa exchangeSession() neste ciclo.
         * O usuário precisa autenticar novamente.
         */
        return;
      }

      setReady(true);
      setStatus("");

      if (clerk.addListener) {
        unsubscribe = clerk.addListener(
          ({ session }) => {
            void exchangeSession(
              session || null
            );
          }
        );
      }

      if (clerk.session) {
        await exchangeSession(clerk.session);
      } else {
        setStatus("");
      }
    }

    void setup().catch((cause) => {
      if (cancelled) return;

      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao iniciar autenticação."
      );

      setStatus("");
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [
    exchangeEndpoint,
    nextPath,
    onAuthenticated,
  ]);

  async function finishSignIn(
    attempt: ClerkSignInAttempt
  ) {
    if (
      attempt.status === "complete" &&
      attempt.createdSessionId &&
      clerkRef.current
    ) {
      await clerkRef.current.setActive({
        session: attempt.createdSessionId,
      });

      setStatus(
        "Acesso confirmado. Abrindo o sistema..."
      );

      return;
    }

    if (
      attempt.status === "needs_second_factor"
    ) {
      setStep("verification");

      setStatus(
        "Digite o código do seu aplicativo autenticador."
      );

      return;
    }

    throw new Error(
      process.env.NODE_ENV === "development"
        ? `Não foi possível concluir o acesso (etapa: ${
            attempt.status || "desconhecida"
          }).`
        : "Não foi possível concluir o acesso. Verifique seus dados e tente novamente."
    );
  }

  function readableAuthError(cause: unknown) {
    const response = cause as {
      errors?: Array<{
        code?: string;
        longMessage?: string;
        message?: string;
      }>;
    };

    const first = response?.errors?.[0];
    const code = String(
      first?.code || ""
    ).toLowerCase();

    const raw = `${first?.longMessage || ""} ${
      first?.message || ""
    }`;

    if (
      code.includes("password_incorrect") ||
      /senha incorreta|incorrect password/i.test(
        raw
      )
    ) {
      return "A senha informada está incorreta.";
    }

    if (
      code.includes("identifier_not_found") ||
      /não encontrad|nao encontrad|not found|couldn't find your account/i.test(
        raw
      )
    ) {
      return "Este e-mail ainda não possui um acesso cadastrado.";
    }

    if (
      code.includes("identifier") ||
      code.includes("password") ||
      /password|identifier|email|username|incorrect|invalid/i.test(
        raw
      )
    ) {
      return "Confira o e-mail e a senha informados.";
    }

    if (
      code.includes("too_many") ||
      /attempt|locked|too many|rate|tentativas/i.test(
        raw
      )
    ) {
      return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
    }

    if (
      process.env.NODE_ENV === "development" &&
      cause instanceof Error
    ) {
      return cause.message;
    }

    return process.env.NODE_ENV === "development" &&
      code
      ? `Não foi possível entrar agora. Código de teste: ${code}.`
      : "Não foi possível entrar agora. Confira os dados e tente novamente.";
  }

  async function submitPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const signIn =
      clerkRef.current?.client?.signIn;

    if (!ready || !signIn || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("Confirmando seu acesso...");

    try {
      let attempt = await signIn.create({
        identifier: identifier.trim(),
        password,
      });

      if (
        attempt.status === "needs_first_factor"
      ) {
        attempt =
          await signIn.attemptFirstFactor({
            strategy: "password",
            password,
          });
      }

      await finishSignIn(attempt);
    } catch (cause) {
      setError(readableAuthError(cause));
      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitVerification(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const signIn =
      clerkRef.current?.client?.signIn;

    if (!ready || !signIn || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("Verificando o código...");

    try {
      const attempt =
        await signIn.attemptSecondFactor({
          strategy: useBackupCode
            ? "backup_code"
            : "totp",
          code: verificationCode.trim(),
        });

      await finishSignIn(attempt);
    } catch {
      setError(
        "Código inválido. Confira e tente novamente."
      );

      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    const signIn =
      clerkRef.current?.client?.signIn;

    if (!ready || !signIn || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/auth/sso-callback",
        redirectUrlComplete: `/login?next=${encodeURIComponent(
          nextPath
        )}`,
      });
    } catch {
      setError(
        "Não foi possível entrar com Google agora."
      );

      setSubmitting(false);
    }
  }

  async function requestFirstAccess(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !migrationEndpoint ||
      firstAccessLoading
    ) {
      return;
    }

    const email = firstAccessEmail
      .trim()
      .toLowerCase();

    if (!email) return;

    setFirstAccessLoading(true);
    setFirstAccessMessage("");
    setError("");

    try {
      const response = await fetch(
        migrationEndpoint,
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const payload = (await response
        .json()
        .catch(() => null)) as
        | FirstAccessPayload
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.message ||
            "Não foi possível solicitar o primeiro acesso."
        );
      }

      setFirstAccessMessage(
        payload.message ||
          "Se o e-mail estiver habilitado, você receberá um convite seguro para criar seu acesso."
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao solicitar o primeiro acesso."
      );
    } finally {
      setFirstAccessLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        <ShieldCheck size={17} />
        Acesso protegido
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
                É seu primeiro acesso?
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-600">
                Informe o e-mail usado anteriormente. Se ele estiver ativo e precisar de atualização,
                você receberá um convite para criar seu novo acesso. Sua senha antiga não será enviada nem reutilizada.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              autoComplete="email"
              required
              value={firstAccessEmail}
              onChange={(event) =>
                setFirstAccessEmail(
                  event.target.value
                )
              }
              placeholder="seu@email.com"
              className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-950"
            />

            <button
              type="submit"
              disabled={firstAccessLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-black text-white disabled:opacity-60"
            >
              {firstAccessLoading ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : null}
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
          <Loader2
            size={16}
            className="animate-spin"
          />
          {status}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {ready && step === "password" ? (
        <form
          onSubmit={submitPassword}
          className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-zinc-900">
                E-mail
              </span>

              <span className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 focus-within:border-zinc-950">
                <Mail
                  size={17}
                  className="shrink-0 text-zinc-400"
                />

                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={identifier}
                  onChange={(event) =>
                    setIdentifier(
                      event.target.value
                    )
                  }
                  placeholder="seu@email.com"
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-zinc-900">
                Senha
              </span>

              <span className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 focus-within:border-zinc-950">
                <LockKeyhole
                  size={17}
                  className="shrink-0 text-zinc-400"
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Digite sua senha"
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (visible) => !visible
                    )
                  }
                  className="text-zinc-400 hover:text-zinc-700"
                  aria-label={
                    showPassword
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 text-sm font-black text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : null}
            Entrar
          </button>

          <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" />
            ou
            <span className="h-px flex-1 bg-zinc-200" />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white text-sm font-black text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base font-black text-[#4285f4]">
              G
            </span>
            Entrar com Google
          </button>
        </form>
      ) : null}

      {ready && step === "verification" ? (
        <form
          onSubmit={submitVerification}
          className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h3 className="text-lg font-black text-zinc-950">
            Confirme seu acesso
          </h3>

          <p className="mt-1 text-sm leading-6 text-zinc-600">
            {useBackupCode
              ? "Digite um dos seus códigos de recuperação."
              : "Digite o código exibido no seu aplicativo autenticador."}
          </p>

          <input
            type="text"
            inputMode={
              useBackupCode
                ? "text"
                : "numeric"
            }
            autoComplete="one-time-code"
            required
            value={verificationCode}
            onChange={(event) =>
              setVerificationCode(
                event.target.value
              )
            }
            placeholder={
              useBackupCode
                ? "Código de recuperação"
                : "000000"
            }
            className="mt-4 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-center text-lg font-black tracking-[0.2em] text-zinc-950 outline-none focus:border-zinc-950"
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 text-sm font-black text-white disabled:opacity-60"
          >
            {submitting ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : null}
            Confirmar
          </button>

          <button
            type="button"
            onClick={() => {
              setUseBackupCode(
                (value) => !value
              );
              setVerificationCode("");
            }}
            className="mt-3 w-full text-center text-sm font-bold text-zinc-600 underline underline-offset-4"
          >
            {useBackupCode
              ? "Usar código do aplicativo"
              : "Usar código de recuperação"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
