"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/layout/Header";
import { PainelSessionProvider } from "@/components/layout/PainelSessionProvider";
import PainelDesktopGuard from "@/components/layout/PainelDesktopGuard";
import { PAINEL_SESSION_STORAGE_KEY } from "@/lib/painel/session-snapshot";
import Sidebar from "@/components/layout/Sidebar";
import PainelPwaRuntime from "@/components/pwa/PainelPwaRuntime";
import MonitoringContextBridge from "@/components/monitoring/MonitoringContextBridge";
import type {
  Permissoes,
  PlanoRecursos,
} from "@/components/layout/navigation";
import type { ResumoAssinatura } from "@/lib/assinatura-utils";
import type {
  ShellNotification,
} from "@/lib/notifications/contracts";
import { createClient } from "@/lib/supabase/client";
import { monitorClientOperation } from "@/lib/monitoring/client";

type Props = {
  children: React.ReactNode;
  idSalao?: string;
  idUsuario?: string;
  userName?: string;
  userEmail?: string;
  permissoes: Permissoes;
  planoRecursos?: PlanoRecursos;
  nivel: string;
  salaoNome?: string;
  salaoResponsavel?: string;
  salaoLogoUrl?: string | null;
  planoCodigo?: string;
  planoNome?: string;
  planoLimites?: {
    usuarios?: number | null;
    profissionais?: number | null;
    clientes?: number | null;
    servicos?: number | null;
    agendamentosMensais?: number | null;
  };
  planoUso?: {
    usuarios?: number;
    profissionais?: number;
    clientes?: number;
    servicos?: number;
    agendamentosMensais?: number;
  };
  assinaturaStatus?: string | null;
  resumoAssinatura?: ResumoAssinatura | null;
  notifications?: ShellNotification[];
};

const FULL_SCREEN_PAINEL_PATHS = new Set(["/agenda", "/caixa"]);

export default function AppShell({
  children,
  idSalao,
  idUsuario,
  userName,
  userEmail,
  permissoes,
  planoRecursos,
  nivel,
  salaoNome,
  salaoResponsavel,
  salaoLogoUrl,
  planoCodigo,
  planoNome,
  planoLimites,
  planoUso,
  assinaturaStatus,
  resumoAssinatura,
  notifications = [],
}: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [contentScrolled, setContentScrolled] = useState(false);
  const [shellNotifications, setShellNotifications] = useState(notifications);
  const router = useRouter();
  const pathname = usePathname();
  const storageScope = [idSalao, idUsuario].filter(Boolean).join(":");
  const notificationStorageKey = storageScope || undefined;
  const hideShellChrome = FULL_SCREEN_PAINEL_PATHS.has(pathname);
  const criticalNotificationsCount = shellNotifications.filter(
    (notification) => notification.critical
  ).length;
  const sessionSnapshot =
    idSalao && idUsuario
      ? {
          idSalao,
          idUsuario,
          userName: userName || "",
          userEmail: userEmail || "",
          nivel,
          permissoes,
          planoRecursos,
          salaoNome,
          salaoResponsavel,
          salaoLogoUrl,
          planoCodigo,
          planoNome,
          planoLimites,
          planoUso,
          assinaturaStatus,
        }
      : null;

  useEffect(() => {
    setShellNotifications(notifications);
  }, [notifications]);

  async function handleLogout() {
    await monitorClientOperation(
      {
        module: "auth",
        action: "logout",
        screen: "painel_shell",
        successMessage: "Logout executado com sucesso.",
        errorMessage: "Falha ao encerrar sessão.",
      },
      async () => {
        const supabase = createClient();
        try {
          await supabase.auth.signOut({ scope: "local" });
        } finally {
          try {
            window.localStorage.removeItem(PAINEL_SESSION_STORAGE_KEY);
          } catch {
            // Best effort only.
          }
        }
        router.push("/login?motivo=logout");
        router.refresh();
      }
    );
  }

  return (
    <PainelSessionProvider value={sessionSnapshot}>
    <PainelDesktopGuard>
    <div className="painel-density min-h-screen bg-zinc-50 text-[var(--app-ink)]">
      <MonitoringContextBridge
        actorType="usuario_salao"
        surface="painel"
        idSalao={idSalao || null}
        idUsuario={idUsuario || null}
      />
      <PainelPwaRuntime />

      {hideShellChrome ? (
        <main className="relative min-h-screen bg-zinc-50">
          <Link
            href="/dashboard"
            className="fixed left-3 top-3 z-[360] inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-3 text-[11px] font-bold text-zinc-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur transition hover:border-zinc-300 hover:bg-white"
          >
            <ArrowLeft size={14} />
            Voltar para o painel
          </Link>
          <div className="min-w-0">{children}</div>
        </main>
      ) : (
      <div className="relative flex min-h-screen">
        <Sidebar
          permissoes={permissoes}
          planoRecursos={planoRecursos}
          nivel={nivel}
          salaoNome={salaoNome}
          salaoResponsavel={salaoResponsavel}
          salaoLogoUrl={salaoLogoUrl}
          planoNome={planoNome}
          resumoAssinatura={resumoAssinatura}
          canSeeAssinatura={Boolean(permissoes?.assinatura_ver)}
          criticalNotificationsCount={criticalNotificationsCount}
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="fixed left-0 right-0 top-0 z-30 bg-white lg:left-[214px]">
            <Header
              userName={userName}
              userEmail={userEmail}
              nivel={nivel}
              salaoNome={salaoNome}
              salaoResponsavel={salaoResponsavel}
              salaoLogoUrl={salaoLogoUrl}
              planoNome={planoNome}
              assinaturaStatus={assinaturaStatus}
              resumoAssinatura={resumoAssinatura}
              canSeePerfilSalao={Boolean(permissoes?.perfil_salao_ver)}
              canSeeConfiguracoes={Boolean(permissoes?.configuracoes_ver)}
              canSeeAssinatura={Boolean(permissoes?.assinatura_ver)}
              criticalNotificationsCount={criticalNotificationsCount}
              notifications={shellNotifications}
              notificationStorageKey={notificationStorageKey}
              scrolled={contentScrolled}
              onOpenSidebar={() => setMobileSidebarOpen(true)}
              onLogout={handleLogout}
            />
          </div>

          <main
            className="scroll-premium min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-zinc-50 px-1.5 pb-1.5 pt-[4.1rem] md:px-2 lg:px-2.5 lg:pt-[4.25rem]"
            onScroll={(event) => {
              const nextScrolled = event.currentTarget.scrollTop > 12;
              setContentScrolled((current) =>
                current === nextScrolled ? current : nextScrolled
              );
            }}
          >
            <div className="min-h-[calc(100dvh-4.1rem)] bg-zinc-50 p-1 md:p-1.5">
              <div className="min-w-0">{children}</div>
            </div>
          </main>
        </div>
      </div>
      )}

    </div>
    </PainelDesktopGuard>
    </PainelSessionProvider>
  );
}
