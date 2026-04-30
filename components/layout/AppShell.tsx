"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
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
import { clearSupabaseBrowserAuthState } from "@/lib/supabase/auth-client-recovery";
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
  planoNome?: string;
  assinaturaStatus?: string | null;
  resumoAssinatura?: ResumoAssinatura | null;
  notifications?: ShellNotification[];
};

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
  planoNome,
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
  const hideShellChrome = pathname === "/agenda" || pathname === "/caixa";
  const criticalNotificationsCount = shellNotifications.filter(
    (notification) => notification.critical
  ).length;

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
        errorMessage: "Falha ao encerrar sessao.",
      },
      async () => {
        const supabase = createClient();
        try {
          await supabase.auth.signOut();
        } finally {
          clearSupabaseBrowserAuthState();
        }
        router.push("/login?motivo=logout");
        router.refresh();
      }
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-[var(--app-ink)]">
      <MonitoringContextBridge
        actorType="usuario_salao"
        surface="painel"
        idSalao={idSalao || null}
        idUsuario={idUsuario || null}
      />

      {hideShellChrome ? (
        <main className="min-h-screen bg-zinc-50">
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
          <div className="fixed left-0 right-0 top-0 z-30 bg-zinc-50 px-2 pb-1 pt-2 md:px-2.5 lg:left-[274px] lg:px-3 xl:px-4">
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
            className="scroll-premium min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-2 pb-2 pt-[4.9rem] md:px-2.5 lg:px-3 lg:pt-[5.1rem] xl:px-4"
            onScroll={(event) => {
              const nextScrolled = event.currentTarget.scrollTop > 12;
              setContentScrolled((current) =>
                current === nextScrolled ? current : nextScrolled
              );
            }}
          >
            <div className="min-h-[calc(100dvh-4.4rem)] bg-zinc-50 p-1.5 md:p-2 xl:p-2.5">
              <div className="min-w-0">{children}</div>
            </div>
          </main>
        </div>
      </div>
      )}

    </div>
  );
}
