"use client";

import { useEffect, useRef, useState } from "react";

function getClerkDomain(key: string) {
  const encoded = key.split("_")[2] || "";
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")).replace(/\$$/, "");
}

export default function ContaClerkPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
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
        if (active && window.Clerk) window.Clerk.mountUserProfile(profileHost, { routing: "hash" });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Falha ao abrir a conta Clerk.");
      }
    }
    void mount();
    return () => {
      active = false;
      if (host && window.Clerk?.unmountUserProfile) window.Clerk.unmountUserProfile(host);
    };
  }, []);

  return <main className="min-h-screen bg-zinc-50 px-4 py-8"><div className="mx-auto max-w-5xl"><a href="/perfil-salao" className="text-sm font-bold text-zinc-700">Voltar ao perfil</a>{error ? <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}<div ref={hostRef} className="mt-6 min-h-[640px]" /></div></main>;
}
