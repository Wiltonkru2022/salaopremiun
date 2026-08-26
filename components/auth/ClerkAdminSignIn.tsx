"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

type ClerkSessionLike = {
  getToken: () => Promise<string | null>;
};

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
  }
}

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

function loadClerkScript(src: string, publishableKey: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (window.Clerk) resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-clerk-publishable-key", publishableKey);
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Falha ao carregar autenticação Clerk.")),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

export function ClerkAdminSignIn({
  exchangeEndpoint,
  nextPath,
  onAuthenticated,
}: {
  exchangeEndpoint: string;
  nextPath: string;
  onAuthenticated: (redirectTo: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const exchangedTokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState("Carregando autenticação segura...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const host = hostRef.current;

    async function exchangeSession(session?: ClerkSessionLike | null) {
      if (!session || cancelled) return;

      setStatus("Validando acesso e MFA...");
      setError("");

      try {
        const token = await session.getToken();
        if (!token) throw new Error("O Clerk não retornou uma sessão válida.");
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

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string; redirectTo?: string; mfaRequired?: boolean }
          | null;

        if (!response.ok || !payload?.ok) {
          exchangedTokenRef.current = null;
          throw new Error(
            payload?.message ||
              (payload?.mfaRequired
                ? "Conclua o segundo fator no Clerk para continuar."
                : "Não foi possível liberar o acesso administrativo.")
          );
        }

        setStatus("Acesso validado. Abrindo o painel...");
        onAuthenticated(payload.redirectTo || nextPath);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Falha ao validar sessão Clerk.");
        setStatus("");
      }
    }

    async function setup() {
      const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
      if (!publishableKey) {
        throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY não configurada.");
      }

      const clerkDomain = decodeClerkDomain(publishableKey);
      const clerkSrc = `https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`;

      await loadClerkScript(clerkSrc, publishableKey);
      if (!window.Clerk) throw new Error("ClerkJS não inicializou.");

      await window.Clerk.load();
      if (cancelled || !host) return;

      window.Clerk.mountSignIn(host, {
        routing: "hash",
        appearance: {
          variables: {
            colorPrimary: "#1f160e",
            borderRadius: "0.9rem",
          },
        },
      });

      if (window.Clerk.addListener) {
        unsubscribe = window.Clerk.addListener(({ session }) => {
          void exchangeSession(session || null);
        });
      }

      if (window.Clerk.session) {
        await exchangeSession(window.Clerk.session);
      } else {
        setStatus("");
      }
    }

    void setup().catch((cause) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : "Falha ao iniciar Clerk.");
      setStatus("");
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (host && window.Clerk?.unmountSignIn) {
        window.Clerk.unmountSignIn(host);
      }
    };
  }, [exchangeEndpoint, nextPath, onAuthenticated]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        <ShieldCheck size={17} />
        Clerk + MFA para acesso administrativo
      </div>
      {status ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          <Loader2 size={16} className="animate-spin" />
          {status}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      <div ref={hostRef} className="min-h-[420px]" />
    </div>
  );
}
