import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Cake,
  Clock3,
  Copy,
  Link2,
  Megaphone,
  MessageCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { canUsePlanFeature } from "@/lib/plans/access";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { auditarCampanhasAction } from "./actions";
import PaginationLinks from "@/components/ui/PaginationLinks";
import { PainelPageHeader } from "@/components/painel-ui";
import CampanhaStatusToggle, {
  CampanhaStatusBadge,
} from "@/components/campanhas/CampanhaStatusToggle";

export const metadata = {
  title: "Campanhas",
};

type SearchParams = {
  ok?: string | string[];
  erro?: string | string[];
  pagina?: string | string[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || "";
}

function siteUrl() {
  return String(
    process.env.NEXT_PUBLIC_SITE_URL || "https://app.salaopremiun.com.br"
  ).replace(/\/$/, "");
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
  const validoDe = String(cupom.valido_de || "").slice(0, 10);
  const validoAte = String(cupom.valido_ate || "").slice(0, 10);
  const limite = Number(cupom.limite_uso_total || 0);
  const usos = Number(cupom.usos || 0);
  if (validoDe && validoDe > today) return "Programada";
  if (validoAte && validoAte < today) return "Expirada";
  if (limite > 0 && usos >= limite) return "Esgotada";
  if (status === "pausada") return "Pausada";
  return "Ativa";
}

function statusClass(label: string) {
  if (label === "Ativa") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (label === "Pausada") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  if (label === "Esgotada") return "border-red-200 bg-red-50 text-red-700";
  if (label === "Programada") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function campanhaWhatsAppMessage(cupom: Record<string, unknown>, link: string) {
  const titulo = String(cupom.nome || "campanha especial").trim();
  const mensagem = String(
    cupom.mensagem_cliente ||
      cupom.descricao ||
      `Preparei uma campanha especial para vocÃª: ${titulo}.`
  ).trim();
  return `${mensagem}\n\nAgende pelo link:\n${link}`;
}

function throwQueryError(...results: Array<{ error?: { message?: string } | null }>) {
  const error = results.find((result) => result?.error)?.error;
  if (error) {
    throw new Error(error.message || "Falha ao consultar os dados das campanhas.");
  }
}

async function loadCampanhasData(idSalao: string, page: number, pageSize: number) {
  const supabase = getDatabaseAdmin();
  const hoje = new Date();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");
  const limiteInativos = new Date();
  limiteInativos.setDate(limiteInativos.getDate() - 30);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const [
    cuponsResult,
    aniversariantesResult,
    clientesResult,
    agendamentosRecentesResult,
  ] = await Promise.all([
    (supabase as any)
      .from("cupons_salao")
      .select(
        "id, codigo, nome, descricao, descricao_interna, mensagem_cliente, tipo_campanha, publico_alvo, publico_tipo, valor_desconto, tipo_desconto, valido_de, valido_ate, ativo, status_campanha, resgate_token, slug, limite_uso_total, limite_uso_cliente, limite_uso_dia, created_at",
        { count: "exact" }
      )
      .eq("id_salao", idSalao)
      .or("automatico_recuperacao.is.null,automatico_recuperacao.eq.false")
      .order("created_at", { ascending: false })
      .range(from, to),
    (supabase as any)
      .from("clientes")
      .select("id, nome, telefone, whatsapp, data_nascimento")
      .eq("id_salao", idSalao)
      .or("status.eq.ativo,ativo.eq.ativo")
      .not("data_nascimento", "is", null)
      .limit(80),
    (supabase as any)
      .from("clientes")
      .select("id, nome, telefone, whatsapp, created_at")
      .eq("id_salao", idSalao)
      .or("status.eq.ativo,ativo.eq.ativo")
      .limit(160),
    (supabase as any)
      .from("agendamentos")
      .select("cliente_id, data")
      .eq("id_salao", idSalao)
      .in("status", ["atendido", "aguardando_pagamento"])
      .gte("data", limiteInativos.toISOString().slice(0, 10))
      .limit(500),
  ]);

  throwQueryError(
    cuponsResult,
    aniversariantesResult,
    clientesResult,
    agendamentosRecentesResult
  );

  const cupomIds = ((cuponsResult.data || []) as Array<Record<string, unknown>>)
    .map((cupom) => String(cupom.id || ""))
    .filter(Boolean);

  const [vinculosResult, usosResult, eventosResult] = cupomIds.length
    ? await Promise.all([
        (supabase as any)
          .from("cupom_salao_servicos")
          .select(
            "id_cupom, id_servico, tipo_beneficio, valor_beneficio, brinde_descricao, limite_uso_servico, servicos(nome)"
          )
          .eq("id_salao", idSalao)
          .in("id_cupom", cupomIds)
          .limit(pageSize * 40),
        (supabase as any)
          .from("cupom_salao_usos")
          .select("id_cupom, id_comanda, valor_desconto, status, created_at")
          .eq("id_salao", idSalao)
          .in("id_cupom", cupomIds)
          .limit(pageSize * 100),
        (supabase as any)
          .from("campanha_eventos")
          .select("id_cupom, tipo, metadata, created_at")
          .eq("id_salao", idSalao)
          .in("id_cupom", cupomIds)
          .order("created_at", { ascending: false })
          .limit(pageSize * 100),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  throwQueryError(vinculosResult, usosResult, eventosResult);

  const metricasPorCupom = new Map<
    string,
    { usos: number; cliques: number; resgates: number; agendamentos: number }
  >();
  if (cupomIds.length) {
    const metricas = await Promise.all(
      cupomIds.map(async (idCupom) => {
        const [cliquesCount, agendamentosCount, resgatesCount] = await Promise.all([
          (supabase as any)
            .from("campanha_eventos")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", idSalao)
            .eq("id_cupom", idCupom)
            .eq("tipo", "clique"),
          (supabase as any)
            .from("campanha_eventos")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", idSalao)
            .eq("id_cupom", idCupom)
            .eq("tipo", "agendamento"),
          (supabase as any)
            .from("cupom_salao_resgates")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", idSalao)
            .eq("id_cupom", idCupom),
        ]);
        throwQueryError(cliquesCount, agendamentosCount, resgatesCount);
        return [
          idCupom,
          {
            usos: 0,
            cliques: Number(cliquesCount.count || 0),
            agendamentos: Number(agendamentosCount.count || 0),
            resgates: Number(resgatesCount.count || 0),
          },
        ] as const;
      })
    );
    for (const [idCupom, metricasCupom] of metricas) {
      metricasPorCupom.set(idCupom, metricasCupom);
    }
  }

  const usosPorCupom = new Map<string, Array<Record<string, unknown>>>();
  for (const uso of (usosResult.data || []) as Array<Record<string, unknown>>) {
    const id = String(uso.id_cupom || "");
    usosPorCupom.set(id, [...(usosPorCupom.get(id) || []), uso]);
  }

  const comandaIds = Array.from(
    new Set(
      ((usosResult.data || []) as Array<Record<string, unknown>>)
        .map((uso) => String(uso.id_comanda || ""))
        .filter(Boolean)
    )
  ).slice(0, pageSize * 100);
  const comandasFechadas = new Set<string>();
  if (comandaIds.length) {
    const comandasResult = await (supabase as any)
      .from("comandas")
      .select("id, status")
      .eq("id_salao", idSalao)
      .in("id", comandaIds)
      .eq("status", "fechada")
      .limit(comandaIds.length);
    throwQueryError(comandasResult);
    for (const comanda of (comandasResult.data || []) as Array<Record<string, unknown>>) {
      const idComanda = String(comanda.id || "");
      if (idComanda) comandasFechadas.add(idComanda);
    }
  }

  const eventosPorCupom = new Map<string, Array<Record<string, unknown>>>();
  for (const evento of (eventosResult.data || []) as Array<Record<string, unknown>>) {
    const id = String(evento.id_cupom || "");
    eventosPorCupom.set(id, [...(eventosPorCupom.get(id) || []), evento]);
  }

  const servicosPorCupom = new Map<string, Array<Record<string, unknown>>>();
  for (const vinculo of (vinculosResult.data || []) as Array<Record<string, unknown>>) {
    const id = String(vinculo.id_cupom || "");
    servicosPorCupom.set(id, [...(servicosPorCupom.get(id) || []), vinculo]);
  }

  const cupons = ((cuponsResult.data || []) as Array<Record<string, unknown>>).map(
    (cupom) => {
      const id = String(cupom.id || "");
      const usos = usosPorCupom.get(id) || [];
      const usosEfetivos = usos.filter((uso) => {
        const status = String(uso.status || "").trim().toLowerCase();
        const idComanda = String(uso.id_comanda || "");
        return (
          status !== "cancelado" &&
          status !== "cancelada" &&
          idComanda &&
          comandasFechadas.has(idComanda)
        );
      });
      const metricas = metricasPorCupom.get(id);
      const servicos = servicosPorCupom.get(id) || [];
      return {
        ...cupom,
        usos: usosEfetivos.length,
        cliques: metricas?.cliques ?? 0,
        resgates: metricas?.resgates ?? 0,
        agendamentos: metricas?.agendamentos ?? 0,
        descontos: usosEfetivos.reduce(
          (sum, uso) => sum + Number(uso.valor_desconto || 0),
          0
        ),
        servicos,
      };
    }
  );

  const clientesComAtendimentoRecente = new Set(
    ((agendamentosRecentesResult.data || []) as Array<Record<string, unknown>>).map(
      (item) => String(item.cliente_id || "")
    )
  );
  const inativos = ((clientesResult.data || []) as Array<Record<string, unknown>>)
    .filter((cliente) =>
      !clientesComAtendimentoRecente.has(String(cliente.id || ""))
    )
    .slice(0, 8);
  const aniversariantes = (
    (aniversariantesResult.data || []) as Array<Record<string, unknown>>
  )
    .filter(
      (cliente) => String(cliente.data_nascimento || "").slice(5, 7) === mesAtual
    )
    .slice(0, 8);

  const totalUsos = cupons.reduce(
    (sum, cupom) => sum + Number(cupom.usos || 0),
    0
  );
  const totalAgendamentos = cupons.reduce(
    (sum, cupom) => sum + Number(cupom.agendamentos || 0),
    0
  );
  const totalCliques = cupons.reduce(
    (sum, cupom) => sum + Number(cupom.cliques || 0),
    0
  );
  const conversao =
    totalCliques > 0 ? Math.round((totalAgendamentos / totalCliques) * 100) : 0;

  return {
    cupons,
    totalCupons: Number(cuponsResult.count || 0),
    aniversariantes,
    inativos,
    kpis: {
      ativas: cupons.filter((cupom) => statusLabel(cupom) === "Ativa").length,
      usos: totalUsos,
      agendamentos: totalAgendamentos,
      cliques: totalCliques,
      conversao,
    },
    eventosRecentes: (
      (eventosResult.data || []) as Array<Record<string, unknown>>
    ).slice(0, 6),
  };
}

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) redirect("/login");
  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    redirect("/dashboard");
  }

  const featureAccess = await canUsePlanFeature(usuario.id_salao, "campanhas");
  if (!featureAccess.allowed) {
    redirect(
      `/comparar-planos?recurso=campanhas&erro=${encodeURIComponent(
        featureAccess.reason || "Campanhas nÃ£o estÃ¡ liberado no plano atual."
      )}`
    );
  }

  const params = await searchParams;
  const paginaAtual = Math.max(0, Number(firstParam(params.pagina) || 1) - 1);
  const pageSize = 10;

  let data: Awaited<ReturnType<typeof loadCampanhasData>>;
  try {
    data = await loadCampanhasData(usuario.id_salao, paginaAtual, pageSize);
  } catch (error) {
    console.error("[CAMPANHAS_LOAD_ERROR]", error);
    return (
      <main className="space-y-5">
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
          <h1 className="text-xl font-black">NÃ£o foi possÃ­vel carregar as campanhas</h1>
          <p className="mt-2 text-sm leading-6">
            Os dados nÃ£o foram substituÃ­dos por uma lista vazia. Atualize a pÃ¡gina e tente novamente.
          </p>
          <Link
            href="/campanhas"
            prefetch
            className="mt-4 inline-flex h-11 items-center rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white"
          >
            Tentar novamente
          </Link>
        </div>
      </main>
    );
  }

  const baseUrl = siteUrl();
  const campanhas = data.cupons as Array<Record<string, any>>;
  const getPageHref = (page: number) => {
    const nextParams = new URLSearchParams();
    nextParams.set("pagina", String(page + 1));
    return `/campanhas?${nextParams.toString()}`;
  };
  const kpiCards = [
    { label: "Campanhas ativas", value: data.kpis.ativas, icon: Sparkles },
    { label: "Cliques no link", value: data.kpis.cliques, icon: Link2 },
    { label: "Agendamentos", value: data.kpis.agendamentos, icon: Megaphone },
    { label: "ConversÃ£o", value: `${data.kpis.conversao}%`, icon: BarChart3 },
  ];

  return (
    <main className="space-y-5">

      <PainelPageHeader
        eyebrow="Crescimento"
        title="Campanhas"
        description="Crie links privados, vincule servicos, controle limites e acompanhe resultados sem sair do fluxo do painel."
        actions={
          <>
            <Link
              href="/campanhas/nova"
              prefetch
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-950 bg-zinc-950 px-3 text-sm font-black text-white shadow-sm transition hover:bg-zinc-800"
            >
              <Plus size={16} />
              Criar campanha
            </Link>
            <form action={auditarCampanhasAction}>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-black text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                type="submit"
              >
                Auditar antigas
              </button>
            </form>
          </>
        }
      />
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
          <div
            key={label}
            className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <Icon className="text-amber-700" size={20} />
            <p className="mt-4 text-sm font-bold text-zinc-500">{String(label)}</p>
            <strong className="mt-1 block text-3xl font-black text-zinc-950">
              {String(value)}
            </strong>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-zinc-950">Lista de campanhas</h2>
              <p className="text-sm text-zinc-500">
                Cards com status, link, validade, uso e serviÃ§os.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {campanhas.map((cupom) => {
              const label = statusLabel(cupom);
              const usados = Number(cupom.usos || 0);
              const limite = Number(cupom.limite_uso_total || 0);
              const progresso =
                limite > 0 ? Math.min(100, Math.round((usados / limite) * 100)) : 0;
              const link = cupom.slug
                ? `${baseUrl}/campanha/${cupom.slug}`
                : cupom.resgate_token
                  ? `${baseUrl}/resgatar-cupom/${cupom.resgate_token}`
                  : "";
              const whatsappUrl = link
                ? `https://wa.me/?text=${encodeURIComponent(
                    campanhaWhatsAppMessage(cupom, link)
                  )}`
                : "";
              const servicos =
                (cupom.servicos as Array<Record<string, any>> | undefined) || [];
              const statusAtual = String(cupom.status_campanha || "ativa");
              return (
                <article
                  key={String(cupom.id)}
                  className="group overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CampanhaStatusBadge
                          id={String(cupom.id)}
                          initialStatus={statusAtual}
                          initialLabel={label}
                          initialClassName={statusClass(label)}
                        />
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-600">
                          Somente por link
                        </span>
                      </div>
                      <h3 className="mt-3 text-2xl font-black text-zinc-950">
                        {String(cupom.nome || "Campanha")}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        {String(
                          cupom.mensagem_cliente ||
                            cupom.descricao ||
                            "Campanha privada para clientes com link."
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                        Usos finalizados
                      </p>
                      <strong className="text-2xl font-black text-zinc-950">
                        {usados}
                        {limite ? `/${limite}` : ""}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                        Validade
                      </p>
                      <p className="mt-1 text-sm font-bold text-zinc-800">
                        {formatDate(cupom.valido_de)} atÃ© {formatDate(cupom.valido_ate)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                        Resultado
                      </p>
                      <p className="mt-1 text-sm font-bold text-zinc-800">
                        {Number(cupom.cliques || 0)} cliques Â·{" "}
                        {Number(cupom.agendamentos || 0)} agendamentos
                      </p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                        Desconto aplicado
                      </p>
                      <p className="mt-1 text-sm font-bold text-zinc-800">
                        {money(Number(cupom.descontos || 0))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-zinc-950 to-amber-500 transition-all"
                        style={{
                          width: `${
                            limite ? progresso : Math.min(100, usados * 8)
                          }%`,
                        }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {servicos.length ? (
                        servicos.slice(0, 5).map((servico) => {
                          const rel = Array.isArray(servico.servicos)
                            ? servico.servicos[0]
                            : servico.servicos;
                          return (
                            <span
                              key={String(servico.id_servico)}
                              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800"
                            >
                              {String(rel?.nome || "ServiÃ§o")}
                            </span>
                          );
                        })
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500">
                          todos os serviÃ§os
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
                    <a
                      href={link || "#"}
                      target="_blank"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950"
                    >
                      <Copy size={16} /> Ver link
                    </a>
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-100"
                      >
                        <MessageCircle size={16} /> Enviar WhatsApp
                      </a>
                    ) : null}
                    <CampanhaStatusToggle
                      id={String(cupom.id)}
                      initialStatus={statusAtual}
                    />
                    <Link
                      href={`/campanhas/${cupom.id}`}
                      prefetch
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950"
                    >
                      <BarChart3 size={16} /> RelatÃ³rio
                    </Link>
                  </div>
                </article>
              );
            })}
            {!campanhas.length ? (
              <div className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
                <Sparkles className="mx-auto text-amber-700" size={34} />
                <h3 className="mt-3 text-2xl font-black text-zinc-950">
                  Crie sua primeira campanha
                </h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Monte um link privado, escolha os serviÃ§os e acompanhe o resultado.
                </p>
                <Link
                  href="/campanhas/nova"
                  prefetch
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white"
                >
                  Criar campanha
                </Link>
              </div>
            ) : null}
            <PaginationLinks
              currentPage={paginaAtual}
              pageSize={pageSize}
              totalItems={Number(data.totalCupons || 0)}
              getHref={getPageHref}
              className="pt-2"
            />
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
              <Clock3 size={18} /> Clientes inativos
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {data.inativos.length} cliente(s) sem atendimento recente.
            </p>
            <div className="mt-4 space-y-2">
              {data.inativos.slice(0, 5).map((cliente) => (
                <div
                  key={String(cliente.id)}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm"
                >
                  <strong>{String(cliente.nome || "Cliente")}</strong>
                  <span className="ml-2 text-zinc-500">
                    {String(cliente.whatsapp || cliente.telefone || "")}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
              <Cake size={18} /> Aniversariantes
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {data.aniversariantes.length} cliente(s) neste mÃªs.
            </p>
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-bold leading-6 text-amber-950">
                Use o modelo de aniversÃ¡rio para criar um cupom de 10% para os clientes ativos deste mÃªs.
              </p>
              <Link
                href="/campanhas/nova?template=aniversario"
                prefetch
                className={`mt-3 inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-black ${
                  data.aniversariantes.length
                    ? "bg-zinc-950 text-white"
                    : "pointer-events-none bg-zinc-200 text-zinc-400"
                }`}
              >
                Criar cupom de aniversÃ¡rio
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {data.aniversariantes.slice(0, 5).map((cliente) => (
                <div
                  key={String(cliente.id)}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm"
                >
                  <strong>{String(cliente.nome || "Cliente")}</strong>
                  <span className="ml-2 text-zinc-500">
                    {formatDate(cliente.data_nascimento)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
