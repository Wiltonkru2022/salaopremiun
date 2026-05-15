import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Copy,
  Gift,
  Link2,
  Scissors,
  Users,
} from "lucide-react";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { atualizarStatusCampanhaAction } from "../actions";

export const metadata = {
  title: "Relatorio da campanha",
};

function siteUrl() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || "https://app.salaopremiun.com.br").replace(/\/$/, "");
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: unknown) {
  const iso = String(value || "").slice(0, 10);
  return iso ? iso.split("-").reverse().join("/") : "Sem data";
}

async function loadCampanhaDetalhe(idSalao: string, id: string) {
  const supabase = getSupabaseAdmin();
  const [
    campanhaResult,
    servicosResult,
    usosResult,
    eventosResult,
    agendamentosResult,
  ] = await Promise.all([
    (supabase as any)
      .from("cupons_salao")
      .select("id, codigo, nome, descricao, descricao_interna, mensagem_cliente, tipo_campanha, publico_tipo, valor_desconto, tipo_desconto, valido_de, valido_ate, ativo, status_campanha, resgate_token, slug, limite_uso_total, limite_uso_cliente, limite_uso_dia, created_at")
      .eq("id_salao", idSalao)
      .eq("id", id)
      .maybeSingle(),
    (supabase as any)
      .from("cupom_salao_servicos")
      .select("id_servico, tipo_beneficio, valor_beneficio, brinde_descricao, limite_uso_servico, servicos(nome, preco, preco_padrao)")
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .limit(120),
    (supabase as any)
      .from("cupom_salao_usos")
      .select("id, id_cliente, id_agendamento, valor_desconto, status, created_at, metadata, clientes(nome, telefone, email)")
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .order("created_at", { ascending: false })
      .limit(200),
    (supabase as any)
      .from("campanha_eventos")
      .select("id, tipo, metadata, created_at, clientes(nome)")
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .order("created_at", { ascending: false })
      .limit(300),
    (supabase as any)
      .from("agendamentos")
      .select("id, data, status, cliente_id, servico_id, desconto_cupom_valor, clientes(nome), servicos(nome)")
      .eq("id_salao", idSalao)
      .eq("id_cupom_salao", id)
      .order("data", { ascending: false })
      .limit(200),
  ]);

  if (!campanhaResult.data?.id) return null;

  const usos = (usosResult.data || []) as Array<Record<string, any>>;
  const eventos = (eventosResult.data || []) as Array<Record<string, any>>;
  const agendamentos = (agendamentosResult.data || []) as Array<Record<string, any>>;
  const cliques = eventos.filter((evento) => evento.tipo === "clique").length;
  const agendamentosEvento = eventos.filter((evento) => evento.tipo === "agendamento").length;
  const cancelados = agendamentos.filter((agenda) => String(agenda.status) === "cancelado").length;
  const clientesNovos = usos.filter((uso) => String(uso.metadata?.origem || "") === "app_cliente").length;
  const descontoTotal = usos.reduce((sum, uso) => sum + Number(uso.valor_desconto || 0), 0);
  const conversao = cliques > 0 ? Math.round((usos.length / cliques) * 100) : 0;
  const servicos = (servicosResult.data || []) as Array<Record<string, any>>;
  const servicosMaisVendidos = servicos.map((servico) => {
    const idServico = String(servico.id_servico || "");
    const total = usos.filter((uso) => String(uso.metadata?.id_servico || "") === idServico).length;
    const rel = Array.isArray(servico.servicos) ? servico.servicos[0] : servico.servicos;
    return { nome: String(rel?.nome || "Servico"), total };
  });

  return {
    campanha: campanhaResult.data as Record<string, any>,
    servicos,
    usos,
    eventos,
    agendamentos,
    metricas: {
      cliques,
      agendamentos: agendamentosEvento || agendamentos.length,
      clientesNovos,
      descontoTotal,
      cancelados,
      conversao,
      servicosMaisVendidos,
    },
  };
}

export default async function CampanhaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) redirect("/login");
  if (String(usuario.nivel || "").toLowerCase() !== "admin") redirect("/dashboard");

  const data = await loadCampanhaDetalhe(usuario.id_salao, id);
  if (!data) redirect("/campanhas?erro=Campanha%20nao%20encontrada.");

  const campanha = data.campanha;
  const link = campanha.slug
    ? `${siteUrl()}/campanha/${campanha.slug}`
    : `${siteUrl()}/resgatar-cupom/${campanha.resgate_token}`;
  const statusAtual = String(campanha.status_campanha || "ativa");
  const kpiCards = [
    { label: "Cliques", value: data.metricas.cliques, icon: Link2 },
    { label: "Agendamentos", value: data.metricas.agendamentos, icon: CalendarDays },
    { label: "Conversao", value: `${data.metricas.conversao}%`, icon: BarChart3 },
    { label: "Desconto usado", value: money(data.metricas.descontoTotal), icon: Gift },
  ];

  return (
    <main className="space-y-6">
      <Link href="/campanhas" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
              Relatorio da campanha
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight">{String(campanha.nome || "Campanha")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              {String(campanha.mensagem_cliente || campanha.descricao || "Campanha privada com link de agendamento.")}
            </p>
          </div>
          <form action={atualizarStatusCampanhaAction}>
            <input type="hidden" name="id" value={String(campanha.id)} />
            <input type="hidden" name="status" value={statusAtual === "ativa" ? "pausada" : "ativa"} />
            <button className="h-11 rounded-2xl bg-white px-5 text-sm font-black text-zinc-950">
              {statusAtual === "ativa" ? "Pausar campanha" : "Ativar campanha"}
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {kpiCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <Icon className="text-amber-700" size={20} />
            <p className="mt-4 text-sm font-bold text-zinc-500">{String(label)}</p>
            <strong className="mt-1 block text-2xl font-black text-zinc-950">{String(value)}</strong>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Copy size={18} /> Link e divulgacao
          </h2>
          <code className="mt-4 block truncate rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
            {link}
          </code>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Status</p>
              <strong>{statusAtual}</strong>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Validade</p>
              <strong>{formatDate(campanha.valido_de)} ate {formatDate(campanha.valido_ate)}</strong>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Limites</p>
              <strong>{Number(campanha.limite_uso_total || 0) || "sem"} total</strong>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Scissors size={18} /> Servicos vinculados
          </h2>
          <div className="mt-4 space-y-3">
            {data.servicos.map((servico) => {
              const rel = Array.isArray(servico.servicos) ? servico.servicos[0] : servico.servicos;
              return (
                <div key={String(servico.id_servico)} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                  <strong className="text-zinc-950">{String(rel?.nome || "Servico")}</strong>
                  <p className="mt-1 text-sm text-zinc-500">
                    {String(servico.tipo_beneficio || "beneficio")} · {Number(servico.valor_beneficio || 0)}
                    {servico.limite_uso_servico ? ` · limite ${servico.limite_uso_servico}` : ""}
                  </p>
                </div>
              );
            })}
            {!data.servicos.length ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                Nenhum servico vinculado.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Users size={18} /> Clientes que usaram
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
            {data.usos.slice(0, 12).map((uso) => {
              const cliente = Array.isArray(uso.clientes) ? uso.clientes[0] : uso.clientes;
              return (
                <div key={String(uso.id)} className="grid grid-cols-[1fr_auto] gap-3 border-b border-zinc-100 px-4 py-3 text-sm last:border-b-0">
                  <span className="font-bold text-zinc-800">{String(cliente?.nome || "Cliente")}</span>
                  <span className="text-zinc-500">{money(Number(uso.valor_desconto || 0))}</span>
                </div>
              );
            })}
            {!data.usos.length ? (
              <p className="p-4 text-sm text-zinc-500">Nenhum uso ainda.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <BarChart3 size={18} /> Servicos mais vendidos
          </h2>
          <div className="mt-4 space-y-3">
            {data.metricas.servicosMaisVendidos.map((servico) => (
              <div key={servico.nome} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <div className="flex items-center justify-between">
                  <strong>{servico.nome}</strong>
                  <span className="text-sm font-black text-amber-700">{servico.total}</span>
                </div>
              </div>
            ))}
            {!data.metricas.servicosMaisVendidos.length ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                Sem dados de servico ainda.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
