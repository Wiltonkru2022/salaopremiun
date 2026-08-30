"use client";

import { useEffect, useRef, useState } from "react";

type ClerkTask = {
  key?: string;
  type?: string;
};

type ClerkSession = {
  tasks?: ClerkTask[];
};

type ClerkLike = {
  load: () => Promise<void>;
  session?: ClerkSession | null;
  client?: {
    activeSessions?: ClerkSession[];
  };
  mountUserProfile?: (
    element: HTMLDivElement,
    options?: Record<string, unknown>
  ) => void;
  unmountUserProfile?: (element: HTMLDivElement) => void;
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
    return "/dashboard";
  }

  return raw;
}

export default function ContaClerkPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const clerkRef = useRef<ClerkLike | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [returnHref, setReturnHref] = useState("/dashboard");

  useEffect(() => {
    const requestedReturn = new URLSearchParams(
      window.location.search
    ).get("next");

    const safeReturn = safeReturnPath(requestedReturn);
    setReturnHref(safeReturn);

    let active = true;

    async function verifySecurity() {
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

        clerkRef.current = clerk;

        const session =
          clerk.session ?? clerk.client?.activeSessions?.[0] ?? null;

        const tasks = Array.isArray(session?.tasks) ? session.tasks : [];
        const hasSetupMfaTask = tasks.some(
          (task) =>
            task?.key === "setup-mfa" ||
            task?.type === "setup-mfa"
        );

        if (!hasSetupMfaTask) {
          window.location.replace(safeReturn);
          return;
        }

        setMfaRequired(true);
        setLoading(false);
      } catch (cause) {
        if (!active) return;

        setLoading(false);
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível verificar a segurança da conta."
        );
      }
    }

    void verifySecurity();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mfaRequired) return;

    const clerk = clerkRef.current;
    const profileHost = hostRef.current;

    if (!clerk || !profileHost) return;

    if (!clerk.mountUserProfile) {
      setError("A área de segurança da conta não está disponível.");
      return;
    }

    clerk.mountUserProfile(profileHost, {
      routing: "hash",
    });

    return () => {
      clerk.unmountUserProfile?.(profileHost);
    };
  }, [mfaRequired]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm font-semibold text-zinc-600">
          Verificando segurança da conta...
        </p>
      </main>
    );
  }

  if (!mfaRequired && !error) {
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
              Segurança da conta
            </p>

            <h1 className="mt-1 text-2xl font-black text-zinc-950">
              Segurança da conta
            </h1>

            <p className="mt-1 text-sm text-zinc-600">
              A autenticação em dois fatores é necessária para concluir este acesso.
            </p>
          </div>

          <a
            href={returnHref}
            className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            Voltar
          </a>
        </div>

        {error ? (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        ) : null}

        {mfaRequired ? (
          <div ref={hostRef} className="mt-6 min-h-[640px]" />
        ) : null}
      </div>
    </main>
  );
}
