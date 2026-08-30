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
  load: (options?: Record<string, unknown>) => Promise<void>;
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
    __internal_ClerkUICtor?: unknown;
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

function isAdminMasterSecurityFlow(returnPath: string) {
  return (
    returnPath === "/admin-master" ||
    returnPath.startsWith("/admin-master/") ||
    returnPath.startsWith("/admin-master/login")
  );
}

function loadScript(src: string, attributes?: Record<string, string>) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Falha ao carregar ${src}.`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = src;

    Object.entries(attributes || {}).forEach(([key, value]) => {
      script.setAttribute(key, value);
    });

    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );

    script.addEventListener(
      "error",
      () => reject(new Error(`Falha ao carregar ${src}.`)),
      { once: true }
    );

    document.head.appendChild(script);
  });
}

export default function ContaClerkPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const clerkRef = useRef<ClerkLike | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSecurityProfile, setShowSecurityProfile] = useState(false);
  const [returnHref, setReturnHref] = useState("/dashboard");

  useEffect(() => {
    const requestedReturn = new URLSearchParams(window.location.search).get("next");
    const safeReturn = safeReturnPath(requestedReturn);
    const adminMasterSecurityFlow = isAdminMasterSecurityFlow(safeReturn);

    setReturnHref(safeReturn);

    let active = true;

    async function verifySecurity() {
      try {
        const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

        if (!key) {
          throw new Error("O acesso seguro não está configurado.");
        }

        const domain = getClerkDomain(key);
        const clerkWindow = window as ClerkWindow;

        // ClerkJS 6 separa o SDK principal do pacote de UI. Como esta tela
        // usa mountUserProfile(), precisamos carregar explicitamente @clerk/ui
        // antes de inicializar o Clerk com os componentes visuais.
        if (!clerkWindow.__internal_ClerkUICtor) {
          await loadScript(
            `https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`
          );
        }

        if (!clerkWindow.Clerk) {
          await loadScript(
            `https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
            { "data-clerk-publishable-key": key }
          );
        }

        const clerk = (window as ClerkWindow).Clerk;
        const ClerkUI = (window as ClerkWindow).__internal_ClerkUICtor;

        if (!clerk) {
          throw new Error("O sistema de autenticação não foi carregado.");
        }

        if (!ClerkUI) {
          throw new Error("Os componentes visuais de segurança não foram carregados.");
        }

        await clerk.load({
          ui: { ClerkUI },
        });

        if (!active) return;

        clerkRef.current = clerk;

        // O backend do Admin Master envia o usuário para /conta quando detecta
        // MFA ausente. Não dependemos de session.tasks nesse fluxo, porque o
        // Clerk pode não expor setup-mfa como task e isso causava o loop
        // /conta -> /admin-master/login -> /conta.
        if (adminMasterSecurityFlow) {
          setShowSecurityProfile(true);
          setLoading(false);
          return;
        }

        const session = clerk.session ?? clerk.client?.activeSessions?.[0] ?? null;
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

        setShowSecurityProfile(true);
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
    if (!showSecurityProfile) return;

    const clerk = clerkRef.current;
    const profileHost = hostRef.current;

    if (!clerk || !profileHost) return;

    if (!clerk.mountUserProfile) {
      setError("A área de segurança da conta não está disponível.");
      return;
    }

    try {
      clerk.mountUserProfile(profileHost, {
        routing: "hash",
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível abrir a área de segurança da conta."
      );
      return;
    }

    return () => {
      clerk.unmountUserProfile?.(profileHost);
    };
  }, [showSecurityProfile]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm font-semibold text-zinc-600">
          Verificando segurança da conta...
        </p>
      </main>
    );
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
              Configure a verificação em duas etapas
            </h1>

            <p className="mt-1 text-sm text-zinc-600">
              Ative o segundo fator abaixo. Depois de concluir, use o botão Voltar para entrar novamente no Admin Master.
            </p>
          </div>

          <a
            href={returnHref}
            className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            Voltar para o login
          </a>
        </div>

        {error ? (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        ) : null}

        {showSecurityProfile ? (
          <div ref={hostRef} className="mt-6 min-h-[640px]" />
        ) : null}
      </div>
    </main>
  );
}
