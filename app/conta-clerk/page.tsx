"use client";

import { FormEvent, useEffect, useState } from "react";
import QRCode from "qrcode";

type TOTPResource = {
  secret?: string;
  uri?: string;
  backupCodes?: string[];
};

type ClerkUserLike = {
  totpEnabled?: boolean;
  createTOTP?: () => Promise<TOTPResource>;
  verifyTOTP?: (params: { code: string }) => Promise<TOTPResource>;
};

type ClerkLike = {
  load: () => Promise<void>;
  user?: ClerkUserLike | null;
};

type ClerkWindow = Window &
  typeof globalThis & {
    Clerk?: ClerkLike;
  };

function getClerkDomain(key: string) {
  const encoded = key.split("_")[2] || "";
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");

  return window
    .atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))
    .replace(/\$$/, "");
}

function safeReturnPath(value: string | null) {
  const raw = String(value || "").trim();

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/admin-master/login?next=%2Fadmin-master";
  }

  return raw;
}

function readableError(cause: unknown) {
  const value = cause as {
    errors?: Array<{
      code?: string;
      message?: string;
      longMessage?: string;
    }>;
  };

  const first = value?.errors?.[0];
  const raw = `${first?.code || ""} ${first?.message || ""} ${
    first?.longMessage || ""
  }`.toLowerCase();

  if (raw.includes("verification") || raw.includes("code")) {
    return "Código inválido ou expirado. Gere um código novo no aplicativo autenticador e tente novamente.";
  }

  if (raw.includes("reverification") || raw.includes("verification_required")) {
    return "O Clerk pediu uma nova confirmação da sua identidade. Volte ao login, entre novamente e retorne para configurar a verificação em duas etapas.";
  }

  if (cause instanceof Error && process.env.NODE_ENV === "development") {
    return cause.message;
  }

  return "Não foi possível concluir a configuração agora. Tente novamente.";
}

export default function ContaClerkPage() {
  const [user, setUser] = useState<ClerkUserLike | null>(null);
  const [returnHref, setReturnHref] = useState(
    "/admin-master/login?next=%2Fadmin-master"
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const requestedReturn = new URLSearchParams(window.location.search).get("next");
    setReturnHref(safeReturnPath(requestedReturn));

    let active = true;

    async function setup() {
      try {
        const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

        if (!key) {
          throw new Error("O acesso seguro não está configurado.");
        }

        const clerkWindow = window as ClerkWindow;

        if (!clerkWindow.Clerk) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.async = true;
            script.crossOrigin = "anonymous";
            script.dataset.clerkPublishableKey = key;
            script.src =
              `https://${getClerkDomain(key)}` +
              `/npm/@clerk/clerk-js@6/dist/clerk.browser.js`;
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error("Não foi possível carregar a autenticação."));
            document.head.appendChild(script);
          });
        }

        const clerk = (window as ClerkWindow).Clerk;

        if (!clerk) {
          throw new Error("O sistema de autenticação não foi carregado.");
        }

        await clerk.load();

        if (!active) return;

        const currentUser = clerk.user || null;

        if (!currentUser) {
          window.location.replace(
            "/admin-master/login?next=%2Fadmin-master"
          );
          return;
        }

        setUser(currentUser);

        if (currentUser.totpEnabled) {
          setComplete(true);
        }
      } catch (cause) {
        if (!active) return;
        setError(readableError(cause));
      } finally {
        if (active) setLoading(false);
      }
    }

    void setup();

    return () => {
      active = false;
    };
  }, []);

  async function createTotp() {
    if (!user?.createTOTP || creating) return;

    setCreating(true);
    setError("");

    try {
      const result = await user.createTOTP();
      const nextSecret = String(result.secret || "");
      const nextUri = String(result.uri || "");

      if (!nextSecret || !nextUri) {
        throw new Error("O Clerk não retornou os dados necessários para configurar o autenticador.");
      }

      setSecret(nextSecret);
      setUri(nextUri);
      setQrCode(await QRCode.toDataURL(nextUri, { width: 260, margin: 1 }));
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setCreating(false);
    }
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.verifyTOTP || verifying) return;

    const normalizedCode = code.replace(/\D/g, "").slice(0, 6);

    if (normalizedCode.length !== 6) {
      setError("Digite os 6 números mostrados no aplicativo autenticador.");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const result = await user.verifyTOTP({ code: normalizedCode });
      const codes = Array.isArray(result.backupCodes)
        ? result.backupCodes.filter(Boolean)
        : [];

      setBackupCodes(codes);
      setComplete(true);
      setSecret("");
      setUri("");
      setQrCode("");
      setCode("");
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="rounded-3xl border border-zinc-200 bg-white px-8 py-7 text-center shadow-sm">
          <p className="text-sm font-bold text-zinc-700">
            Preparando a segurança do Admin Master...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
            Segurança do Admin Master
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
            Verificação em duas etapas
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Use Google Authenticator, Microsoft Authenticator, Authy ou outro aplicativo compatível com TOTP.
          </p>
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {error ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {complete ? (
            <div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-lg font-black text-emerald-900">
                  Verificação em duas etapas ativada
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  Sua conta administrativa agora está protegida com autenticador.
                </p>
              </div>

              {backupCodes.length ? (
                <div className="mt-6">
                  <h2 className="text-base font-black text-zinc-950">
                    Guarde seus códigos de recuperação
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    Salve estes códigos em local seguro. Cada código deve ser usado apenas uma vez.
                  </p>
                  <div className="mt-4 grid gap-2 rounded-2xl bg-zinc-100 p-4 font-mono text-sm sm:grid-cols-2">
                    {backupCodes.map((backupCode) => (
                      <span key={backupCode}>{backupCode}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <a
                href={returnHref}
                className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-5 py-3.5 text-sm font-black text-white"
              >
                Continuar para o Admin Master
              </a>
            </div>
          ) : !uri ? (
            <div>
              <div className="rounded-2xl bg-zinc-100 p-5">
                <p className="font-black text-zinc-950">Como funciona</p>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
                  <li>1. Clique em configurar autenticador.</li>
                  <li>2. Escaneie o QR Code no seu aplicativo.</li>
                  <li>3. Digite o código de 6 números para confirmar.</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => void createTotp()}
                disabled={creating}
                className="mt-6 w-full rounded-2xl bg-zinc-950 px-5 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Gerando código seguro..." : "Configurar autenticador"}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex justify-center rounded-3xl border border-zinc-200 bg-white p-5">
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="QR Code para configurar o autenticador"
                    width={260}
                    height={260}
                    className="h-[260px] w-[260px]"
                  />
                ) : null}
              </div>

              <div className="mt-5 rounded-2xl bg-zinc-100 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-zinc-500">
                  Não consegue escanear?
                </p>
                <p className="mt-2 break-all font-mono text-sm font-bold text-zinc-900">
                  {secret}
                </p>
              </div>

              <form onSubmit={verifyTotp} className="mt-6">
                <label htmlFor="totp-code" className="text-sm font-black text-zinc-950">
                  Código do autenticador
                </label>
                <input
                  id="totp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-center text-2xl font-black tracking-[0.35em] text-zinc-950 outline-none focus:border-zinc-950"
                />

                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="mt-4 w-full rounded-2xl bg-zinc-950 px-5 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifying ? "Confirmando..." : "Ativar verificação em duas etapas"}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
