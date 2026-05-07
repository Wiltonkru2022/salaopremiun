import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  MonitorSmartphone,
  Save,
  Settings2,
  Smartphone,
  UserRoundCheck,
} from "lucide-react";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { loadSalonNotificationSettings } from "@/lib/salon-notification-settings";
import { salvarConfiguracoesNotificacoesAction } from "./actions";

type SearchParams = Promise<{ salvo?: string; erro?: string }>;

type ToggleItem = {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
};

function SettingsToggle({ item }: { item: ToggleItem }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[18px] border border-zinc-200 bg-white p-4 shadow-sm">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-zinc-950">{item.title}</span>
        <span className="mt-1 block text-sm leading-5 text-zinc-500">
          {item.description}
        </span>
      </span>
      <input
        type="checkbox"
        name={item.name}
        defaultChecked={item.defaultChecked}
        className="mt-1 h-5 w-5 shrink-0 accent-zinc-950"
      />
    </label>
  );
}

function SettingsGroup({
  icon,
  title,
  description,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: ToggleItem[];
}) {
  return (
    <section className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-800">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{items.map((item) => <SettingsToggle key={item.name} item={item} />)}</div>
    </section>
  );
}

export default async function ConfiguracoesNotificacoesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const { usuario } = await getPainelUserContext();
  const params = searchParams ? await searchParams : {};
  const settings = usuario?.id_salao
    ? await loadSalonNotificationSettings(usuario.id_salao)
    : null;

  if (!usuario?.id_salao || !settings) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Nao foi possivel identificar o salao atual.
      </div>
    );
  }

  return (
    <form action={salvarConfiguracoesNotificacoesAction} className="space-y-5">
      <section className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              <BellRing size={14} />
              Notificacoes e push
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] text-zinc-950">
              O que o salao envia e recebe
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              Ligue apenas os avisos que fazem sentido para sua operacao. As
              notificacoes continuam com protecao contra envio duplicado.
            </p>
          </div>

          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white">
            <Save size={16} />
            Salvar ajustes
          </button>
        </div>

        {params.salvo ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {params.salvo}
          </div>
        ) : null}
        {params.erro ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.erro}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <SettingsGroup
            icon={<Smartphone size={20} />}
            title="App cliente"
            description="Avisos que aparecem para quem agenda pelo aplicativo."
            items={[
              {
                name: "clienteAgendamentoConfirmado",
                title: "Agendamento confirmado",
                description: "Envia quando o salao confirma um horario.",
                defaultChecked: settings.clienteAgendamentoConfirmado,
              },
              {
                name: "clienteLembrete30min",
                title: "Lembrete antes do atendimento",
                description: "Avisa o cliente antes do horario marcado.",
                defaultChecked: settings.clienteLembrete30min,
              },
              {
                name: "clienteAtendimentoFinalizado",
                title: "Atendimento finalizado",
                description: "Agradece o cliente quando o atendimento termina.",
                defaultChecked: settings.clienteAtendimentoFinalizado,
              },
              {
                name: "clienteAvaliarAtendimento",
                title: "Pedido de avaliacao",
                description: "Pede avaliacao depois do atendimento finalizado.",
                defaultChecked: settings.clienteAvaliarAtendimento,
              },
              {
                name: "clienteReagendamento",
                title: "Reagendamento",
                description: "Confirma quando o horario foi reagendado.",
                defaultChecked: settings.clienteReagendamento,
              },
              {
                name: "clienteCancelamento",
                title: "Cancelamento",
                description: "Avisa o cliente quando um horario for cancelado.",
                defaultChecked: settings.clienteCancelamento,
              },
            ]}
          />

          <SettingsGroup
            icon={<UserRoundCheck size={20} />}
            title="App profissional"
            description="Avisos para a rotina de quem atende na agenda."
            items={[
              {
                name: "profissionalLembrete30min",
                title: "Atendimento proximo",
                description: "Lembrete antes do atendimento com nome do cliente.",
                defaultChecked: settings.profissionalLembrete30min,
              },
              {
                name: "profissionalAtendimentoFinalizado",
                title: "Atendimento finalizado",
                description: "Avisa quando a comanda/agendamento foi concluido.",
                defaultChecked: settings.profissionalAtendimentoFinalizado,
              },
              {
                name: "profissionalReagendamento",
                title: "Reagendamento",
                description: "Avisa quando um cliente ou o salao muda o horario.",
                defaultChecked: settings.profissionalReagendamento,
              },
              {
                name: "profissionalCancelamento",
                title: "Cancelamento",
                description: "Avisa quando um cliente cancela pelo app.",
                defaultChecked: settings.profissionalCancelamento,
              },
            ]}
          />

          <SettingsGroup
            icon={<MonitorSmartphone size={20} />}
            title="Painel do salao"
            description="Alertas internos no sino e push do painel."
            items={[
              {
                name: "salaoNovoAgendamentoApp",
                title: "Pedido vindo do app cliente",
                description: "Avisa quando um cliente solicita horario.",
                defaultChecked: settings.salaoNovoAgendamentoApp,
              },
              {
                name: "salaoCancelamentoCliente",
                title: "Cancelamento feito pelo cliente",
                description: "Avisa o salao quando o cliente libera o horario.",
                defaultChecked: settings.salaoCancelamentoCliente,
              },
              {
                name: "salaoReagendamentoCliente",
                title: "Reagendamento feito pelo cliente",
                description: "Avisa o salao quando o cliente troca data ou hora.",
                defaultChecked: settings.salaoReagendamentoCliente,
              },
              {
                name: "salaoAvaliacoes",
                title: "Avaliacoes recebidas",
                description: "Mostra elogios e alerta quando a nota for baixa.",
                defaultChecked: settings.salaoAvaliacoes,
              },
            ]}
          />
        </div>

        <aside className="h-fit rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-950">
            <CalendarClock size={18} />
            Lembrete de horario
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Padrao recomendado: 30 minutos antes. Pode aumentar se seu salao
            costuma ter deslocamento longo.
          </p>
          <label className="mt-4 block text-sm font-semibold text-zinc-700">
            Minutos antes
            <input
              type="number"
              min={5}
              max={240}
              step={5}
              name="lembreteMinutosAntes"
              defaultValue={settings.lembreteMinutosAntes}
              className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none focus:border-zinc-400"
            />
          </label>

          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-950">
              <Settings2 size={16} />
              Entrega tecnica
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Notificacao push depende do cliente/profissional permitir avisos
              no celular. A fila segura duplicidade mesmo se a acao for clicada
              duas vezes.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CheckCircle2 size={16} />
              Configuracao salva por salao
            </div>
            Cada salao escolhe seu proprio comportamento.
          </div>
        </aside>
      </section>
    </form>
  );
}
