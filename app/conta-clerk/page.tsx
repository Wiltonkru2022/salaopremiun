"use client";

import { useEffect, useRef, useState } from "react";

function getClerkDomain(key: string) {
  const encoded = key.split("_")[2] || "";
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return window
    .atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))
    .replace(/\$$/, "");
}

function safeReturnPath(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/perfil-salao";
  return raw;
}

export default function ContaClerkPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [returnHref, setReturnHref] = useState("/perfil-salao");

  useEffect(() => {
    const requestedReturn = new URLSearchParams(window.location.search).get("next");
    setReturnHref(safeReturnPath(requestedReturn));

    const host = hostRef.current;
    if (!host) return;
    const profileHost = host;
    let active = true;

    async function mount() {
      try {
        const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
        if (!key) throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY nao configurada.");

        if (!window.Clerk) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.async = true;
            script.crossOrigin = "anonymous";
            script.dataset.clerkPublishableKey = key;
            script.src = `https://${getClerkDomain(key)}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Nao foi possivel carregar o Clerk."));
            document.head.appendChild(script);
          });
        }

        await window.Clerk?.load();
        const clerk = window.Clerk as
          | (typeof window.Clerk & {
              mountUserProfile?: (
                element: HTMLDivElement,
                options?: Record<string, unknown>
              ) => void;
              unmountUserProfile?: (element: HTMLDivElement) => void;
            })
          | undefined;

        if (!clerk?.mountUserProfile) {
          throw new Error("O perfil de seguranca do Clerk nao esta disponivel.");
        }
        if (active) clerk.mountUserProfile(profileHost, { routing: "hash" });
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Falha ao abrir a conta Clerk."
          );
        }
      }
    }

    void mount();
    return () => {
      active = false;
      const clerk = window.Clerk as
        | (typeof window.Clerk & {
            unmountUserProfile?: (element: HTMLDivElement) => void;
          })
        | undefined;
      clerk?.unmountUserProfile?.(host);
    };
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
              Segurança da conta
            </p>
            <h1 className="mt-1 text-2xl font-black text-zinc-950">
              Conta e MFA do Clerk
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Ative a autenticação em dois fatores antes de retornar ao acesso administrativo.
            </p>
          </div>
          <a
            href={returnHref}
            className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            Concluir e voltar
          </a>
        </div>

        {error ? (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
        ) : null}
        <div ref={hostRef} className="mt-6 min-h-[640px]" />
      </div>
    </main>
  );
}
