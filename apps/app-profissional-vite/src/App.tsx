import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, type View } from "./components/layout/AppShell";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { useAuth } from "./contexts/AuthContext";
import { useProfissionalData } from "./hooks/useProfissionalData";
import { toISODate } from "./lib/date";
import { AgendaPage } from "./pages/AgendaPage";
import { AvaliacoesPage } from "./pages/AvaliacoesPage";
import { ClientesPage } from "./pages/ClientesPage";
import { ComissaoPage } from "./pages/ComissaoPage";
import { ComandasPage } from "./pages/ComandasPage";
import { ConfiguracoesPage } from "./pages/ConfiguracoesPage";
import { InicioPage } from "./pages/InicioPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificacoesPage } from "./pages/NotificacoesPage";
import { PerfilPage } from "./pages/PerfilPage";
import { ServicosPage } from "./pages/ServicosPage";
import { DuvidasPage, InstalarPage, PrivacidadePage, SuportePage } from "./pages/StaticPages";

const titles: Record<View, string> = {
  inicio: "Inicio",
  agenda: "Agenda",
  clientes: "Clientes",
  servicos: "Servicos",
  comandas: "Comandas",
  comissao: "Comissao",
  avaliacoes: "Avaliacoes",
  notificacoes: "Notificacoes",
  perfil: "Perfil",
  configuracoes: "Configuracoes",
  suporte: "Suporte",
  duvidas: "Duvidas",
  instalar: "Instalar",
  privacidade: "Privacidade"
};

export function App() {
  const { profissional, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>("inicio");
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  const data = useProfissionalData(profissional?.id);

  const subtitle = useMemo(() => {
    if (view === "agenda") return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(selectedDate + "T12:00:00"));
    if (view === "comandas") return `${data.comandas.filter((item) => item.status === "aberta").length} abertas`;
    if (view === "notificacoes") return `${data.notificacoes.filter((item) => !item.lida).length} nao lidas`;
    if (view === "comissao") return "Repasse e producao";
    if (view === "perfil") return "Dados, horarios e suporte";
    return profissional?.nome;
  }, [view, selectedDate, data.comandas, data.notificacoes, profissional?.nome]);

  if (authLoading) {
    return <div className="grid min-h-screen place-items-center bg-zinc-950 text-sm font-black uppercase tracking-[0.22em] text-white">Carregando</div>;
  }

  if (!profissional) return <LoginPage />;

  return (
    <AppShell view={view} setView={setView} title={titles[view]} subtitle={subtitle || undefined}>
      {data.error ? (
        <Card className="mb-4 border-red-200 bg-red-50 text-red-700">
          <div className="text-sm font-bold">{data.error}</div>
        </Card>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{data.loading ? "Sincronizando" : "Offline cache ativo"}</div>
        <Button variant="secondary" className="h-10 px-3" onClick={() => data.refresh()}>
          <RefreshCw size={16} />
          Atualizar
        </Button>
      </div>

      {view === "inicio" ? <InicioPage nome={profissional.nome_exibicao || profissional.nome} agendamentos={data.agendamentos} clientes={data.clientes} servicos={data.servicos} comandas={data.comandas} goTo={setView} /> : null}
      {view === "agenda" ? <AgendaPage agendamentos={data.agendamentos} clientes={data.clientes} servicos={data.servicos} profissionais={data.profissionais} profissionalAtual={profissional} selectedDate={selectedDate} setSelectedDate={setSelectedDate} actions={data.actions} /> : null}
      {view === "clientes" ? <ClientesPage clientes={data.clientes} agendamentos={data.agendamentos} comandas={data.comandas} onSave={data.actions.salvarCliente} onEdit={data.actions.editarCliente} /> : null}
      {view === "servicos" ? <ServicosPage servicos={data.servicos} onSave={data.actions.salvarServico} onEdit={data.actions.editarServico} /> : null}
      {view === "comandas" ? <ComandasPage clientes={data.clientes} servicos={data.servicos} comandas={data.comandas} itens={data.itensComanda} actions={data.actions} /> : null}
      {view === "comissao" ? <ComissaoPage comissoes={data.comissoes} /> : null}
      {view === "avaliacoes" ? <AvaliacoesPage avaliacoes={data.avaliacoes} onDelete={data.actions.excluirAvaliacao} /> : null}
      {view === "notificacoes" ? <NotificacoesPage notificacoes={data.notificacoes} onRead={data.actions.marcarNotificacaoLida} /> : null}
      {view === "perfil" ? <PerfilPage profissional={profissional} goTo={setView} onChangePassword={data.actions.trocarSenha} /> : null}
      {view === "configuracoes" ? <ConfiguracoesPage /> : null}
      {view === "suporte" ? <SuportePage /> : null}
      {view === "duvidas" ? <DuvidasPage /> : null}
      {view === "instalar" ? <InstalarPage /> : null}
      {view === "privacidade" ? <PrivacidadePage /> : null}
    </AppShell>
  );
}

