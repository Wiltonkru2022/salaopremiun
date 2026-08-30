"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

function authenticationDomain(publishableKey: string) {
  const encoded = publishableKey.split("_")[2] || "";
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return window.atob(padded).replace(/\$$/, "").trim();
}

function loadAuthenticationScript(src: string, publishableKey: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-clerk-publishable-key", publishableKey);
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error()), { once: true });
    document.head.appendChild(script);
  });
}

export default function AuthenticationCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function finish() {
      const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
      if (!key) throw new Error();
      const domain = authenticationDomain(key);
      await loadAuthenticationScript(
        `https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
        key
      );
      await window.Clerk?.load();
      await window.Clerk?.handleRedirectCallback?.({});
    }

    void finish().catch(() => {
      if (active) setError("Não foi possível concluir o acesso com Google.");
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4efe7] px-4">
      <div className="w-full max-w-md rounded-[28px] border border-[#ded4c6] bg-white p-8 text-center shadow-xl">
        {error ? (
          <p className="text-sm font-bold text-rose-700">{error}</p>
        ) : (
          <div className="flex items-center justify-center gap-3 text-sm font-bold text-zinc-700">
            <Loader2 size={19} className="animate-spin" /> Confirmando seu acesso...
          </div>
        )}
      </div>
    </main>
  );
}
