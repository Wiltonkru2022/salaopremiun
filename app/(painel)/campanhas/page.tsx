import { redirect } from "next/navigation";
import {
  BarChart3,
  Cake,
  Clock3,
  Copy,
  Gift,
  Link2,
  Megaphone,
  Pause,
  Play,
  Plus,
  Scissors,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  atualizarStatusCampanhaAction,
  criarCampanhaCupomAction,
} from "./actions";

export const metadata = {
  title: "Campanhas",
};

type SearchParams = {
  ok?: string | string[];
  erro?: string | string[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || "";
}

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

function statusLabel(cupom: Record<string, unknown>) {
  const today = new Date().toISOString().slice(0, 10);
  const status = String(cupom.status_campanha || "ativa");
  const validoAte = String(cupom.valido_ate || "").slice(0, 10);
  const limite = Number(cupom.limite_uso_total || 0);
  const usos = Number(cupom.usos || 0);
  if (validoAte && validoAte < today) return "Expirada";
  if (limite > 0 && usos >= limite) return "Esgotada";
  if (status === "pausada") return "Pausada";
  return "Ativa";
}

function statusClass(label: string) {
  if (label === "Ativa") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (label === "Pausada") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  if (label === "Esgotada") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

async function loadCampanhasData(idSalao: string) {
  const supabase = getSupabaseAdmin();
  const hoje = new Date();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");
  const limiteInativos = new Date();
  limiteInativos.setDate(limiteInativos.getDate() - 30);

  const [
    cuponsResult,
    servicosResult,
    vinculosResult,
    usosResult,
    eventosResult,
    aniversariantesResult,
    clientesResult,
    agendamentosRecentesResult,
  ] = await Promise.all([
    (supabase as any)
      .from("cupons_salao")
      .select("id, codigo, nome, descricao, descricao_interna, mensagem_cliente, tipo_campanha, publico_alvo, publico_tipo, valor_desconto, tipo_desconto, valido_de, valido_ate, ativo, status_campanha, resgate_token, slug, limite_uso_total, limite_uso_cliente, limite_uso_dia, created_at")
      .eq("id_salao", idSalao)
      .order("created_at", { ascending: false })
      .limit(20),
    (supabase as any)
      .from("servicos")
      .select("id, nome, preco, preco_padrao, ativo, app_cliente_visivel")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .limit(120),
    (supabase as any)
      .from("cupom_salao_servicos")
      .select("id_cupom, id_servico, tipo_beneficio, valor_beneficio, brinde_descricao, limite_uso_servico, servicos(nome)")
      .eq("id_salao", idSalao)
      .limit(500),
    (supabase as any)
      .from("cupom_salao_usos")
      .select("id_cupom, valor_desconto, status, created_at")
      .eq("id_salao", idSalao)
      .limit(1000),
    (supabase as any)
      .from("campanha_eventos")
      .select("id_cupom, tipo, metadata, created_at")
      .eq("id_salao", idSalao)
      .order("created_at", { ascending: false })
      .limit(1000),
    (supabase as any)
      .from("clientes")
      .select("id, nome, telefone, whatsapp, data_nascimento")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .not("data_nascimento", "is", null)
      .limit(80),
    (supabase as any)
      .from("clientes")
      .select("id, nome, telefone, whatsapp, created_at")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .limit(160),
    (supabase as any)
      .from("agendamentos")
      .select("cliente_id, data")
      .eq("id_salao", idSalao)
      .in("status", ["atendido", "aguardando_pagamento"])
      .gte("data", limiteInativos.toISOString().slice(0, 10))
      .limit(500),
  ]);

  const usosPorCupom = new Map<string, Array<Record<string, unknown>>>();
  for (const uso of ((usosResult.data || []) as Array<Record<string, unknown>>)) {
    const id = String(uso.id_cupom || "");
    usosPorCupom.set(id, [...(usosPorCupom.get(id) || []), uso]);
  }

  const eventosPorCupom = new Map<string, Array<Record<string, unknown>>>();
  for (const evento of ((eventosResult.data || []) as Array<Record<string, unknown>>)) {
    const id = String(evento.id_cupom || "");
    eventosPorCupom.set(id, [...(eventosPorCupom.get(id) || []), evento]);
  }

  const servicosPorCupom = new Map<string, Array<Record<string, unknown>>>();
  for (const vinculo of ((vinculosResult.data || []) as Array<Record<string, unknown>>)) {
    const id = String(vinculo.id_cupom || "");
    servicosPorCupom.set(id, [...(servicosPorCupom.get(id) || []), vinculo]);
  }

  const cupons = ((cuponsResult.data || []) as Array<Record<string, unknown>>).map((cupom) => {
    const id = String(cupom.id || "");
    const usos = usosPorCupom.get(id) || [];
    const eventos = eventosPorCupom.get(id) || [];
    const servicos = servicosPorCupom.get(id) || [];
    return {
      ...cupom,
      usos: usos.length,
      cliques: eventos.filter((evento) => evento.tipo === "clique").length,
      agendamentos: eventos.filter((evento) => evento.tipo === "agendamento").length,
      receita: usos.reduce((sum, uso) => sum + Number(uso.valor_desconto || 0), 0),
      servicos,
    };
  });

  const clientesComAtendimentoRecente = new Set(
    ((agendamentosRecentesResult.data || []) as Array<Record<string, unknown>>).map((item) =>
      String(item.cliente_id || "")
    )
  );
  const inativos = ((clientesResult.data || []) as Array<Record<string, unknown>>)
    .filter((cliente) => !clientesComAtendimentoRecente.has(String(cliente.id || "")))
    .slice(0, 8);
  const aniversariantes = ((aniversariantesResult.data || []) as Array<Record<string, unknown>>)
    .filter((cliente) => String(cliente.data_nascimento || "").slice(5, 7) === mesAtual)
    .slice(0, 8);

  const totalUsos = cupons.reduce((sum, cupom) => sum + Number(cupom.usos || 0), 0);
  const totalCliques = cupons.reduce((sum, cupom) => sum + Number(cupom.cliques || 0), 0);
  const conversao = totalCliques > 0 ? Math.round((totalUsos / totalCliques) * 100) : 0;

  return {
    cupons,
    servicos: (servicosResult.data || []) as Array<Record<string, unknown>>,
    aniversariantes,
    inativos,
    kpis: {
      ativas: cupons.filter((cupom) => statusLabel(cupom) === "Ativa").length,
      usos: totalUsos,
      cliques: totalCliques,
      conversao,
    },
    eventosRecentes: ((eventosResult.data || []) as Array<Record<string, unknown>>).slice(0, 6),
  };
}

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) redirect("/login");
  if (String(usuario.nivel || "").toLowerCase() !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const data = await loadCampanhasData(usuario.id_salao).catch(() => ({
    cupons: [],
    servicos: [],
    aniversariantes: [],
    inativos: [],
    eventosRecentes: [],
    kpis: { ativas: 0, usos: 0, cliques: 0, conversao: 0 },
  }));
  const baseUrl = siteUrl();
  const campanhas = data.cupons as Array<Record<string, any>>;
  const servicosCadastro = data.servicos as Array<Record<string, unknown>>;
  const kpiCards = [
    { label: "Campanhas ativas", value: data.kpis.ativas, icon: Sparkles },
    { label: "Cliques no link", value: data.kpis.cliques, icon: Link2 },
    { label: "Agendamentos", value: data.kpis.usos, icon: Megaphone },
    { label: "Conversao", value: `${data.kpis.conversao}%`, icon: BarChart3 },
  ];

  return (
    <main className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-1/4 top-8 h-56 w-56 animate-pulse rounded-full bg-amber-200/35 blur-3xl" />
        <div className="absolute right-4 top-40 h-72 w-72 animate-pulse rounded-full bg-rose-200/35 blur-3xl" />
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
              <Sparkles size={14} />
              Campanhas inteligentes
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              Campanhas
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">
              Crie links privados, vincule serviços, controle limites e acompanhe
              resultado sem deixar a promoção solta no app.
            </p>
            <a
              href="#nova-campanha"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-zinc-950 shadow-[0_0_28px_rgba(245,197,66,0.32)] transition hover:-translate-y-0.5"
            >
              <Plus size={18} />
              Nova campanha
            </a>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
            <div className="rounded-[1.4rem] bg-gradient-to-br from-amber-100 via-white to-rose-100 p-4 text-zinc-950">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  celular do cliente
                </span>
                <TrendingUp className="text-emerald-600" />
              </div>
              <div className="mt-8 rounded-3xl bg-white p-4 shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                  Promo Escova Maio
                </p>
                <h3 className="mt-2 text-2xl font-black">Escova por R$ 60</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Link privado aberto. Cliente escolhe servico, profissional e horario.
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full w-3/4 rounded-full bg-zinc-950" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {firstParam(params.ok) ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {firstParam(params.ok)}
        </p>
      ) : null}
      {firstParam(params.erro) ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {firstParam(params.erro)}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        {kpiCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <Icon className="text-amber-700" size={20} />
            <p className="mt-4 text-sm font-bold text-zinc-500">{String(label)}</p>
            <strong className="mt-1 block text-3xl font-black text-zinc-950">{String(value)}</strong>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-zinc-950">Lista de campanhas</h2>
              <p className="text-sm text-zinc-500">Cards com status, link, validade, uso e servicos.</p>
            </div>
          </div>

          <div className="grid gap-4">
            {campanhas.map((cupom) => {
              const label = statusLabel(cupom);
              const usados = Number(cupom.usos || 0);
              const limite = Number(cupom.limite_uso_total || 0);
              const progresso = limite > 0 ? Math.min(100, Math.round((usados / limite) * 100)) : 0;
              const link = cupom.slug
                ? `${baseUrl}/campanha/${cupom.slug}`
                : cupom.resgate_token
                  ? `${baseUrl}/resgatar-cupom/${cupom.resgate_token}`
                  : "";
              const servicos = (cupom.servicos as Array<Record<string, any>> | undefined) || [];
              const statusAtual = String(cupom.status_campanha || "ativa");
              return (
                <article key={String(cupom.id)} className="group overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(label)}`}>
                          {label}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-600">
                          Somente por link
                        </span>
                      </div>
                      <h3 className="mt-3 text-2xl font-black text-zinc-950">{String(cupom.nome || "Campanha")}</h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        {String(cupom.mensagem_cliente || cupom.descricao || "Campanha privada para clientes com link.")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Usos</p>
                      <strong className="text-2xl font-black text-zinc-950">
                        {usados}{limite ? `/${limite}` : ""}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Validade</p>
                      <p className="mt-1 text-sm font-bold text-zinc-800">
                        {formatDate(cupom.valido_de)} ate {formatDate(cupom.valido_ate)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Resultado</p>
                      <p className="mt-1 text-sm font-bold text-zinc-800">
                        {Number(cupom.cliques || 0)} cliques · {Number(cupom.agendamentos || 0)} agendamentos
                      </p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Desconto reservado</p>
                      <p className="mt-1 text-sm font-bold text-zinc-800">{money(Number(cupom.receita || 0))}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-zinc-950 to-amber-500 transition-all" style={{ width: `${limite ? progresso : Math.min(100, usados * 8)}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {servicos.length ? (
                        servicos.slice(0, 5).map((servico) => {
                          const rel = Array.isArray(servico.servicos) ? servico.servicos[0] : servico.servicos;
                          return (
                            <span key={String(servico.id_servico)} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                              {String(rel?.nome || "Servico")}
                            </span>
                          );
                        })
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500">
                          todos os servicos
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 lg:flex-row lg:items-center">
                    {link ? (
                      <code className="min-w-0 flex-1 truncate rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
                        {link}
                      </code>
                    ) : null}
                    <a href={link || "#"} target="_blank" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950">
                      <Copy size={16} /> Ver link
                    </a>
                    <form action={atualizarStatusCampanhaAction}>
                      <input type="hidden" name="id" value={String(cupom.id)} />
                      <input type="hidden" name="status" value={statusAtual === "ativa" ? "pausada" : "ativa"} />
                      <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white">
                        {statusAtual === "ativa" ? <Pause size={16} /> : <Play size={16} />}
                        {statusAtual === "ativa" ? "Pausar" : "Ativar"}
                      </button>
                    </form>
                    <a href={`/campanhas/${cupom.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950">
                      <BarChart3 size={16} /> Relatorio
                    </a>
                  </div>
                </article>
              );
            })}
            {!campanhas.length ? (
              <div className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
                <Sparkles className="mx-auto text-amber-700" size={34} />
                <h3 className="mt-3 text-2xl font-black text-zinc-950">Crie sua primeira campanha</h3>
                <p className="mt-2 text-sm text-zinc-500">Monte um link privado, escolha os servicos e acompanhe o resultado.</p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
              <Clock3 size={18} /> Clientes inativos
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{data.inativos.length} cliente(s) sem atendimento recente.</p>
            <div className="mt-4 space-y-2">
              {data.inativos.slice(0, 5).map((cliente) => (
                <div key={String(cliente.id)} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm">
                  <strong>{String(cliente.nome || "Cliente")}</strong>
                  <span className="ml-2 text-zinc-500">{String(cliente.whatsapp || cliente.telefone || "")}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
              <Cake size={18} /> Aniversariantes
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{data.aniversariantes.length} cliente(s) neste mes.</p>
            <div className="mt-4 space-y-2">
              {data.aniversariantes.slice(0, 5).map((cliente) => (
                <div key={String(cliente.id)} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm">
                  <strong>{String(cliente.nome || "Cliente")}</strong>
                  <span className="ml-2 text-zinc-500">{formatDate(cliente.data_nascimento)}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section id="nova-campanha" className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <Gift size={22} />
          </span>
          <div>
            <h2 className="text-2xl font-black text-zinc-950">Criar campanha</h2>
            <p className="text-sm text-zinc-500">Dados, link, validade, limites e servicos permitidos.</p>
          </div>
        </div>

        <form action={criarCampanhaCupomAction} className="mt-6 space-y-6">
          <input type="hidden" name="tipo" value="manual" />
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Nome da campanha
              <input name="titulo" required className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none focus:border-zinc-950" placeholder="Promocao Escova Maio" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Slug do link
              <input name="slug" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 lowercase outline-none focus:border-zinc-950" placeholder="escova-maio" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Codigo
              <input name="codigo" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 uppercase outline-none focus:border-zinc-950" placeholder="ESCOVA20" />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Descricao interna
              <textarea name="descricao_interna" rows={3} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:border-zinc-950" placeholder="Controle interno do salao." />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Mensagem para cliente
              <textarea name="mensagem_cliente" rows={3} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:border-zinc-950" placeholder="Agende pelo link e ganhe 20% de desconto." />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Status
              <select name="status_campanha" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none">
                <option value="ativa">Ativa</option>
                <option value="pausada">Pausada</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Inicio
              <input name="valido_de" type="date" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Fim
              <input name="valido_ate" type="date" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Limite total
              <input name="limite_total" type="number" min="1" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" placeholder="50" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Limite por dia
              <input name="limite_dia" type="number" min="1" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" placeholder="5" />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Publico
              <select name="publico_tipo" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none">
                <option value="link">Aberta pelo link</option>
                <option value="clientes_especificos">Clientes especificos</option>
                <option value="novos_clientes">Novos clientes</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Tipo de beneficio
              <select name="tipo_desconto" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none">
                <option value="percentual">Desconto em %</option>
                <option value="valor_fixo">Desconto em R$</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Valor padrao
              <input name="valor_desconto" required type="number" min="1" step="0.01" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" placeholder="20" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Limite por cliente
              <input name="limite_cliente" type="number" min="1" defaultValue={1} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2">
              <Scissors size={18} className="text-amber-700" />
              <h3 className="text-lg font-black text-zinc-950">Servicos permitidos</h3>
            </div>
            <p className="mt-1 text-sm text-zinc-500">Se nenhum servico for marcado, o cupom fica sem vitrine publica de servicos.</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {servicosCadastro.map((servico) => {
                const preco = Number(servico.preco_padrao ?? servico.preco ?? 0);
                return (
                  <label key={String(servico.id)} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <input name="servicos" value={String(servico.id)} type="checkbox" className="mt-1 h-4 w-4 accent-zinc-950" />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-zinc-950">{String(servico.nome || "Servico")}</strong>
                        <span className="text-xs font-bold text-zinc-500">Preco normal: {money(preco)}</span>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <select name={`beneficio_tipo_${servico.id}`} className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold">
                            <option value="desconto_percentual">%</option>
                            <option value="desconto_valor">R$ off</option>
                            <option value="preco_fixo">Preco fixo</option>
                            <option value="brinde">Brinde</option>
                          </select>
                          <input name={`beneficio_valor_${servico.id}`} type="number" min="0" step="0.01" className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold" placeholder="20" />
                          <input name={`limite_servico_${servico.id}`} type="number" min="1" className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold" placeholder="limite" />
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <button className="inline-flex h-13 items-center gap-2 rounded-2xl bg-zinc-950 px-6 py-4 text-sm font-black text-white shadow-[0_18px_30px_rgba(15,23,42,0.18)]" type="submit">
            <Sparkles size={18} />
            Criar campanha premium
          </button>
        </form>
      </section>
    </main>
  );
}
