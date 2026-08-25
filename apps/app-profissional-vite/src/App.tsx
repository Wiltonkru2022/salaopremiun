import { RefreshCw } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ptBR } from "../../../core/i18n/pt-BR";
import { AppShell, type View } from "./components/layout/AppShell";
import { isNativeProfessionalApp } from "./components/PushPermissionButton";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { ProfessionalPartnerAdPopup } from "./components/ProfessionalPartnerAdPopup";
import { useAuth } from "./contexts/AuthContext";
import { useProfissionalData } from "./hooks/useProfissionalData";
import { toISODate } from "./lib/date";

const ProfessionalNotificationOnboarding = lazy(() =>
  import("./components/ProfessionalNotificationOnboarding").then((module) => ({
    default: module.ProfessionalNotificationOnboarding,
  }))
);
const AgendaPage = lazy(() =>
  import("./pages/AgendaPage").then((module) => ({ default: module.AgendaPage }))
);
const AvaliacoesPage = lazy(() =>
  import("./pages/AvaliacoesPage").then((module) => ({ default: module.AvaliacoesPage }))
);
const ClientesPage = lazy(() =>
  import("./pages/ClientesPage").then((module) => ({ default: module.ClientesPage }))
);
const ComissaoPage = lazy(() =>
  import("./pages/ComissaoPage").then((module) => ({ default: module.ComissaoPage }))
);
const ComandasPage = lazy(() =>
  import("./pages/ComandasPage").then((module) => ({ default: module.ComandasPage }))
);
const ConfiguracoesPage = lazy(() =>
  import("./pages/ConfiguracoesPage").then((module) => ({ default: module.ConfiguracoesPage }))
);
const CuponsPage = lazy(() =>
  import("./pages/CuponsPage").then((module) => ({ default: module.CuponsPage }))
);
const InicioPage = lazy(() =>
  import("./pages/InicioPage").then((module) => ({ default: module.InicioPage }))
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const NotificacoesPage = lazy(() =>
  import("./pages/NotificacoesPage").then((module) => ({ default: module.NotificacoesPage }))
);
const PerfilPage = lazy(() =>
  import("./pages/PerfilPage").then((module) => ({ default: module.PerfilPage }))
);
const ServicosPage = lazy(() =>
  import("./pages/ServicosPage").then((module) => ({ default: module.ServicosPage }))
);
const DuvidasPage = lazy(() =>
  import("./pages/StaticPages").then((module) => ({ default: module.DuvidasPage }))
);
const InstalarPage = lazy(() =>
  import("./pages/StaticPages").then((module) => ({ default: module.InstalarPage }))
);
const PrivacidadePage = lazy(() =>
  import("./pages/StaticPages").then((module) => ({ default: module.PrivacidadePage }))
);
const SuportePage = lazy(() =>
  import("./pages/StaticPages").then((module) => ({ default: module.SuportePage }))
);

const titles: Record<View, string> = {
  inicio: ptBR.professional.home,
  agenda: ptBR.professional.agenda,
  clientes: ptBR.professional.clients,
  servicos: ptBR.professional.services,
  comandas: ptBR.professional.tickets,
  cupons: "Cupons",
  comissao: ptBR.professional.commission,
  avaliacoes: ptBR.professional.reviews,
  notificacoes: ptBR.professional.alerts,
  perfil: ptBR.professional.profile,
  configuracoes: ptBR.professional.settings,
  suporte: ptBR.professional.support,
  duvidas: ptBR.professional.questions,
  instalar: "Instalar",
  privacidade: "Privacidade",
};

function RouteFallback() {
  return (
    <div className="grid min-h-40 place-items-center rounded-[1.4rem] border border-zinc-200 bg-white text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
      Carregando tela
    </div>
  );
}

export function App() {
  const { profissional, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>("inicio");
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  const data = useProfissionalData(
    profissional?.id,
    profissional?.podeVerAgendaTodos ??
      profissional?.pode_ver_agenda_todos ??
      String(profissional?.nivel_acesso || "").toLowerCase() === "todos",
    view
  );
  const unreadNotifications = data.notificacoes.filter((item) => !item.lida).length;
  const refreshData = data.refresh;

  useEffect(() => {
    if (!profissional || !isNativeProfessionalApp()) return;

    let active = true;
    let actionHandle: { remove: () => Promise<void> } | null = null;
    let receivedHandle: { remove: () => Promise<void> } | null = null;

    void import("@capacitor/push-notifications").then(({ PushNotifications }) => {
      if (!active) return;

      void PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
        const url = String(event.notification.data?.url || "");
        setView(url.includes("/agenda") ? "agenda" : "notificacoes");
        void refreshData();
      }).then((handle) => {
        if (active) {
          actionHandle = handle;
          return;
        }
        void handle.remove().catch(() => undefined);
      });

      void PushNotifications.addListener("pushNotificationReceived", () => {
        void refreshData();
      }).then((handle) => {
        if (active) {
          receivedHandle = handle;
          return;
        }
        void handle.remove().catch(() => undefined);
      });
    });

    return () => {
      active = false;
      if (actionHandle) void actionHandle.remove().catch(() => undefined);
      if (receivedHandle) void receivedHandle.remove().catch(() => undefined);
    };
  }, [refreshData, profissional]);

  const subtitle = useMemo(() => {
    if (view === "agenda") {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }).format(new Date(selectedDate + "T12:00:00"));
    }
    if (view === "comandas") {
      return `${data.comandas.filter((item) => item.status === "aberta").length} abertas`;
    }
    if (view === "notificacoes") return `${unreadNotifications} não lidas`;
    if (view === "comissao") return "Repasse e produção";
    if (view === "perfil") return "Dados, horários e suporte";
    if (view === "cupons") return "Benefícios privados para suas clientes";
    return profissional?.nome || "";
  }, [
    view,
    selectedDate,
    data.comandas,
    unreadNotifications,
    profissional?.nome,
  ]);

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-950 text-sm font-black uppercase tracking-[0.22em] text-white">
        Carregando
      </div>
    );
  }
  if (!profissional) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <AppShell
      view={view}
      setView={setView}
      title={titles[view]}
      subtitle={subtitle || ""}
      unreadNotifications={unreadNotifications}
    >
      <Suspense fallback={null}>
        <ProfessionalNotificationOnboarding />
      </Suspense>
      <ProfessionalPartnerAdPopup idSalao={profissional.id_salao} enabled={view === "inicio"} />

      {data.error ? (
        <Card className="mb-4 border-red-200 bg-red-50 text-red-700">
          <div className="text-sm font-bold">{data.error}</div>
        </Card>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs font-black uppercase tracking-[0.12em] text-zinc-400">
          {data.loading
            ? ptBR.common.syncing
            : data.isOnline
              ? `${ptBR.common.online}${
                  data.lastSyncedAt
                    ? ` · ${new Date(data.lastSyncedAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""
                }`
              : ptBR.professional.offlineWarning}
        </div>
        <Button variant="secondary" className="h-10 px-3" onClick={() => data.refresh()}>
          <RefreshCw size={16} />
          Atualizar
        </Button>
      </div>

      <Suspense fallback={<RouteFallback />}>
        {view === "inicio" ? (
          <InicioPage
            nome={profissional.nome_exibicao || profissional.nome}
            agendamentos={data.agendamentos}
            clientes={data.clientes}
            servicos={data.servicos}
            comandas={data.comandas}
            goTo={setView}
          />
        ) : null}
        {view === "agenda" ? (
          <AgendaPage
            agendamentos={data.agendamentos}
            clientes={data.clientes}
            servicos={data.servicos}
            profissionais={data.profissionais}
            profissionalAtual={profissional}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            actions={data.actions}
          />
        ) : null}
        {view === "clientes" ? (
          <ClientesPage
            clientes={data.clientes}
            agendamentos={data.agendamentos}
            comandas={data.comandas}
            onSave={data.actions.salvarCliente}
            onEdit={data.actions.editarCliente}
          />
        ) : null}
        {view === "servicos" ? (
          <ServicosPage
            servicos={data.servicos}
            onSave={data.actions.salvarServico}
            onEdit={data.actions.editarServico}
          />
        ) : null}
        {view === "comandas" ? (
          <ComandasPage
            clientes={data.clientes}
            servicos={data.servicos}
            comandas={data.comandas}
            itens={data.itensComanda}
            actions={data.actions}
          />
        ) : null}
        {view === "cupons" ? <CuponsPage clientes={data.clientes} /> : null}
        {view === "comissao" ? <ComissaoPage comissoes={data.comissoes} /> : null}
        {view === "avaliacoes" ? (
          <AvaliacoesPage
            avaliacoes={data.avaliacoes}
            onDelete={data.actions.excluirAvaliacao}
          />
        ) : null}
        {view === "notificacoes" ? (
          <NotificacoesPage
            notificacoes={data.notificacoes}
            onRead={data.actions.marcarNotificacaoLida}
          />
        ) : null}
        {view === "perfil" ? <PerfilPage profissional={profissional} goTo={setView} /> : null}
        {view === "configuracoes" ? <ConfiguracoesPage /> : null}
        {view === "suporte" ? <SuportePage /> : null}
        {view === "duvidas" ? <DuvidasPage /> : null}
        {view === "instalar" ? <InstalarPage /> : null}
        {view === "privacidade" ? <PrivacidadePage /> : null}
      </Suspense>
    </AppShell>
  );
}
