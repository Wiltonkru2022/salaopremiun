import {
  CalendarHeart,
  MessageSquareMore,
  PhoneCall,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import MarketingPriceSimulator from "@/components/marketing/MarketingPriceSimulator";
import { getUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

type ClienteRow = {
  id: string;
  nome?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  data_nascimento?: string | null;
};

type ComandaRow = {
  id_cliente?: string | null;
  total?: number | null;
  fechada_em?: string | null;
};

type ClienteInsight = {
  id: string;
  nome: string;
  contato: string;
  totalGasto: number;
  ultimaCompra: string | null;
  diasSemRetorno: number | null;
  aniversarioMesAtual: boolean;
};

function getMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getContact(cliente: ClienteRow) {
  return (
    cliente.whatsapp ||
    cliente.telefone ||
    cliente.email ||
    "Contato nao informado"
  );
}

function getDaysSince(dateString?: string | null) {
  const date = parseDate(dateString);
  if (!date) return null;

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  return Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);
}

function isBirthdayThisMonth(value?: string | null) {
  if (!value) return false;

  const parts = value.split(/[-/]/);
  const month =
    parts.length >= 2
      ? Number(parts[1])
      : Number(new Date(value).getMonth() + 1 || 0);

  return month === new Date().getMonth() + 1;
}

export default async function MarketingPage() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id_salao")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario?.id_salao) {
    return (
      <div className="rounded-[30px] border border-rose-200 bg-rose-50 p-6 text-rose-700">
        Nao foi possivel identificar o salao da conta atual.
      </div>
    );
  }

  const inicioJanela = new Date();
  inicioJanela.setMonth(inicioJanela.getMonth() - 12);

  const [{ data: clientesData }, { data: comandasData }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, telefone, whatsapp, email, data_nascimento")
      .eq("id_salao", usuario.id_salao)
      .order("nome", { ascending: true }),

    supabase
      .from("comandas")
      .select("id_cliente, total, fechada_em")
      .eq("id_salao", usuario.id_salao)
      .eq("status", "fechada")
      .gte("fechada_em", inicioJanela.toISOString())
      .order("fechada_em", { ascending: false }),
  ]);

  const clientes = (clientesData as ClienteRow[]) || [];
  const comandas = (comandasData as ComandaRow[]) || [];

  const metricasPorCliente = new Map<
    string,
    { totalGasto: number; ultimaCompra: string | null }
  >();

  for (const comanda of comandas) {
    if (!comanda.id_cliente) continue;

    const atual = metricasPorCliente.get(comanda.id_cliente) || {
      totalGasto: 0,
      ultimaCompra: null,
    };

    metricasPorCliente.set(comanda.id_cliente, {
      totalGasto: atual.totalGasto + Number(comanda.total || 0),
      ultimaCompra: atual.ultimaCompra || comanda.fechada_em || null,
    });
  }

  const insights: ClienteInsight[] = clientes.map((cliente) => {
    const metricas = metricasPorCliente.get(cliente.id);

    return {
      id: cliente.id,
      nome: cliente.nome || "Cliente sem nome",
      contato: getContact(cliente),
      totalGasto: Number(metricas?.totalGasto || 0),
      ultimaCompra: metricas?.ultimaCompra || null,
      diasSemRetorno: getDaysSince(metricas?.ultimaCompra || null),
      aniversarioMesAtual: isBirthdayThisMonth(cliente.data_nascimento),
    };
  });

  const aniversariantes = insights
    .filter((cliente) => cliente.aniversarioMesAtual)
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const semRetorno = insights
    .filter((cliente) => (cliente.diasSemRetorno || 0) >= 45)
    .slice()
    .sort(
      (a, b) => (b.diasSemRetorno || 0) - (a.diasSemRetorno || 0)
    );

  const clientesVip = insights
    .filter((cliente) => cliente.totalGasto > 0)
    .slice()
    .sort((a, b) => b.totalGasto - a.totalGasto);

  const cadastrosSemContato = insights.filter(
    (cliente) => cliente.contato === "Contato nao informado"
  );

  const mensagensPotenciais =
    aniversariantes.length + semRetorno.length + clientesVip.slice(0, 20).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-zinc-200 bg-white px-6 py-7 text-zinc-950 shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
            <Sparkles size={13} />
            Marketing com dados reais
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
            Central de relacionamento pronta para vender recorrencia
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-zinc-500 sm:text-base">
            Aqui voce enxerga quem precisa voltar, quem esta no mes do aniversario,
            quem mais compra e qual lote de mensagens pode virar faturamento.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<CalendarHeart size={18} />}
          label="Aniversariantes"
          value={String(aniversariantes.length)}
          helper="Clientes do mes para oferta especial."
        />
        <KpiCard
          icon={<PhoneCall size={18} />}
          label="Sem retorno 45d+"
          value={String(semRetorno.length)}
          helper="Base ideal para recuperar agenda."
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="Clientes VIP"
          value={String(clientesVip.slice(0, 10).length)}
          helper="Top receita para acao premium."
        />
        <KpiCard
          icon={<MessageSquareMore size={18} />}
          label="Mensagens potenciais"
          value={String(mensagensPotenciais)}
          helper="Volume comercial ja mapeado na base."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <InsightCard
            title="Aniversariantes do mes"
            subtitle="Oferta quente para lotar agenda e gerar retorno."
            emptyText="Nenhum aniversariante identificado neste mes."
            items={aniversariantes.slice(0, 8).map((cliente) => ({
              title: cliente.nome,
              meta: cliente.contato,
              badge: "Parabens + oferta",
            }))}
          />

          <InsightCard
            title="Clientes para reativacao"
            subtitle="Quem esta ha mais tempo sem comprar merece campanha agora."
            emptyText="Nenhum cliente acima do corte de inatividade."
            items={semRetorno.slice(0, 8).map((cliente) => ({
              title: cliente.nome,
              meta: `${cliente.contato} • ${cliente.diasSemRetorno || 0} dia(s) sem compra`,
              badge: "Retorno",
            }))}
          />

          <InsightCard
            title="Clientes VIP"
            subtitle="Base para kits premium, manutencao recorrente e indicacao."
            emptyText="Sem vendas fechadas suficientes para formar ranking."
            items={clientesVip.slice(0, 8).map((cliente) => ({
              title: cliente.nome,
              meta: `${cliente.contato} • ${getMoney(cliente.totalGasto)} no periodo`,
              badge: "Alta receita",
            }))}
          />
        </div>

        <div className="space-y-6">
          <MarketingPriceSimulator />

          <WhatsAppSetupCard mensagensPotenciais={mensagensPotenciais} />

          <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Modelos de mensagem
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
              Textos que ja ajudam no comercial
            </h2>

            <div className="mt-5 space-y-3">
              <TemplateCard
                title="Aniversario"
                body="Oi [nome], seu mes especial chegou. Preparamos uma condicao exclusiva para voce voltar ao salao com carinho e prioridade."
              />
              <TemplateCard
                title="Retorno"
                body="Oi [nome], faz um tempo desde seu ultimo atendimento. Tenho uma janela boa esta semana e posso te ajudar a manter o resultado em dia."
              />
              <TemplateCard
                title="VIP"
                body="Oi [nome], abrimos uma agenda premium para clientes especiais. Se quiser, reservo um horario com atencao prioritaria para voce."
              />
            </div>
          </section>

          <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              <Users size={14} />
              Higiene da base
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
              Cadastros sem contato
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Antes de vender disparo por mensagem, feche estes cadastros sem telefone
              ou WhatsApp.
            </p>

            <div className="mt-4 rounded-[24px] border border-zinc-200 bg-zinc-50 px-4 py-4">
              <div className="text-3xl font-bold text-zinc-950">
                {cadastrosSemContato.length}
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                cliente(s) ainda sem contato utilizavel.
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function WhatsAppSetupCard({
  mensagensPotenciais,
}: {
  mensagensPotenciais: number;
}) {
  const custoEstimado = mensagensPotenciais * 0.25;

  return (
    <section className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-white p-6 text-zinc-950">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          <MessageSquareMore size={14} />
          WhatsApp pronto para plugar
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
          Configuracao de disparo e cobranca por mensagem
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          A tela ja separa base, volume e custo. Na integracao, cada mensagem
          enviada deve registrar consumo para cobrar o salao por disparo.
        </p>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3">
        <MiniMetric label="Volume mapeado" value={String(mensagensPotenciais)} />
        <MiniMetric
          label="Custo estimado"
          value={getMoney(custoEstimado)}
        />
        <MiniMetric label="Status" value="Aguardando API" />
      </div>

      <div className="grid gap-3 border-t border-zinc-100 p-5">
        <SetupStep
          title="1. Provedor WhatsApp"
          description="Campos previstos: token, telefone remetente, webhook e status do canal."
        />
        <SetupStep
          title="2. Registro de consumo"
          description="Cada envio deve gravar cliente, campanha, template, custo unitario e status."
        />
        <SetupStep
          title="3. Cobranca do salao"
          description="O consumo entra na assinatura como adicional por mensagem enviada."
        />
      </div>
    </section>
  );
}

function KpiCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[rgba(199,162,92,0.14)] text-[var(--app-accent-strong)]">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-4 font-display text-4xl font-bold tracking-[-0.05em] text-zinc-950">
        {value}
      </div>
      <p className="mt-2 text-sm text-zinc-500">{helper}</p>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-zinc-950">{value}</div>
    </div>
  );
}

function SetupStep({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="text-sm font-bold text-zinc-950">{title}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">{description}</div>
    </div>
  );
}

function InsightCard({
  title,
  subtitle,
  emptyText,
  items,
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  items: Array<{ title: string; meta: string; badge: string }>;
}) {
  return (
    <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
        {title}
      </h2>
      <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
            {emptyText}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={`${item.title}-${item.meta}`}
              className="flex flex-col gap-3 rounded-[24px] border border-zinc-200 bg-zinc-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-950">
                  {item.title}
                </div>
                <div className="mt-1 truncate text-sm text-zinc-500">
                  {item.meta}
                </div>
              </div>

              <span className="inline-flex shrink-0 rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">
                {item.badge}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TemplateCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-4 py-4">
      <div className="text-sm font-semibold text-zinc-950">{title}</div>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
    </article>
  );
}
