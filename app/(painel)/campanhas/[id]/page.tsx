import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Copy,
  Gift,
  Link2,
  MessageCircle,
  Search,
  Scissors,
  UserPlus,
  Users,
} from "lucide-react";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { canUsePlanFeature } from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import PaginationLinks from "@/components/ui/PaginationLinks";
import {
  adicionarClienteCampanhaAction,
  atualizarCampanhaAction,
  atualizarServicosCampanhaAction,
  atualizarStatusCampanhaAction,
  auditarCampanhasAction,
  excluirCampanhaAction,
  removerClienteCampanhaAction,
} from "../actions";

export const metadata = {
  title: "Relatório da campanha",
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

function normalizeWhatsApp(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

function statusLabel(campanha: Record<string, unknown>, usos: number) {
  const today = new Date().toISOString().slice(0, 10);
  const status = String(campanha.status_campanha || "ativa");
  const validoDe = String(campanha.valido_de || "").slice(0, 10);
  const validoAte = String(campanha.valido_ate || "").slice(0, 10);
  const limite = Number(campanha.limite_uso_total || 0);
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

function isCanceledStatus(value: unknown) {
  const status = String(value || "").trim().toLowerCase();
  return status === "cancelado" || status === "cancelada";
}

function isClosedComanda(value: unknown) {
  return String(value || "").trim().toLowerCase() === "fechada";
}

function toDateKey(value: unknown) {
  return String(value || "").slice(0, 10);
}

function getRelationOne<T extends Record<string, any>>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value || null;
}

async function loadCampanhaDetalhe(
  idSalao: string,
  id: string,
  usosPage: number,
  usosPageSize: number,
  clientesPage: number,
  clientesPageSize: number,
  buscaCliente: string
) {
  const supabase = getSupabaseAdmin();
  const usosFrom = usosPage * usosPageSize;
  const usosTo = usosFrom + usosPageSize - 1;
  const clientesFrom = clientesPage * clientesPageSize;
  const clientesTo = clientesFrom + clientesPageSize - 1;
  const buscaLimpa = buscaCliente.trim();
  const buscaSegura = buscaLimpa.replace(/[%_(),]/g, " ").replace(/\s+/g, " ").trim();
  const buscaNumeros = buscaSegura.replace(/\D/g, "");
  const clientesDisponiveisQuery = (supabase as any)
    .from("clientes")
    .select("id, nome, telefone, email, whatsapp")
    .eq("id_salao", idSalao)
    .or("status.eq.ativo,ativo.eq.ativo")
    .order("nome", { ascending: true })
    .limit(buscaSegura ? 50 : 30);

  const clientesDisponiveisResult = buscaSegura
    ? clientesDisponiveisQuery.or(
        [
          `nome.ilike.%${buscaSegura}%`,
          `email.ilike.%${buscaSegura}%`,
          `telefone.ilike.%${buscaNumeros || buscaSegura}%`,
          `whatsapp.ilike.%${buscaNumeros || buscaSegura}%`,
        ].join(",")
      )
    : clientesDisponiveisQuery;

  const [
    campanhaResult,
    servicosResult,
    usosResult,
    eventosResult,
    cliquesCountResult,
    agendamentosEventosCountResult,
    resgatesCountResult,
    agendamentosResult,
    agendamentosCountResult,
    canceladosCountResult,
    usosMetricasResult,
    clientesPermitidosResult,
    clientesResult,
    servicosDisponiveisResult,
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
      .select("id, id_cliente, id_agendamento, id_comanda, valor_desconto, status, created_at, metadata, clientes(nome, telefone, email), comandas(status)")
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .order("created_at", { ascending: false })
      .limit(5000),
    (supabase as any)
      .from("campanha_eventos")
      .select("id, tipo, metadata, created_at, clientes(nome)")
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .order("created_at", { ascending: false })
      .limit(300),
    (supabase as any)
      .from("campanha_eventos")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .eq("tipo", "clique"),
    (supabase as any)
      .from("campanha_eventos")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .eq("tipo", "agendamento"),
    (supabase as any)
      .from("cupom_salao_resgates")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", idSalao)
      .eq("id_cupom", id),
    (supabase as any)
      .from("agendamentos")
      .select("id, data, created_at, status, cliente_id, servico_id, desconto_cupom_valor, id_comanda, clientes(nome, created_at), servicos(nome, preco, preco_padrao), comandas(id, total, subtotal, status, fechada_em)")
      .eq("id_salao", idSalao)
      .eq("id_cupom_salao", id)
      .order("data", { ascending: false })
      .limit(1000),
    (supabase as any)
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", idSalao)
      .eq("id_cupom_salao", id),
    (supabase as any)
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", idSalao)
      .eq("id_cupom_salao", id)
      .in("status", ["cancelado", "cancelada"]),
    (supabase as any)
      .from("cupom_salao_usos")
      .select("id, id_cliente, valor_desconto, status, metadata, id_agendamento, id_comanda")
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .limit(5000),
    (supabase as any)
      .from("cupom_salao_clientes")
      .select("id_cliente, clientes(id, nome, telefone, email, whatsapp)", { count: "exact" })
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .range(clientesFrom, clientesTo),
    clientesDisponiveisResult,
    (supabase as any)
      .from("servicos")
      .select("id, nome, preco, preco_padrao, ativo, app_cliente_visivel")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .limit(200),
  ]);

  if (!campanhaResult.data?.id) return null;

  const usos = (usosResult.data || []) as Array<Record<string, any>>;
  const totalUsos = usos.length;
  const eventos = (eventosResult.data || []) as Array<Record<string, any>>;
  const agendamentos = (agendamentosResult.data || []) as Array<Record<string, any>>;
  const usosMetricas = (usosMetricasResult.data || []) as Array<Record<string, any>>;
  const cliques = Number(cliquesCountResult.count || 0);
  const agendamentosEvento = Number(agendamentosEventosCountResult.count || 0);
  const resgates = Number(resgatesCountResult.count || 0);
  const totalAgendamentos = Number(agendamentosCountResult.count || agendamentos.length);
  const cancelados = Number(canceladosCountResult.count || agendamentos.filter((agenda) => isCanceledStatus(agenda.status)).length);
  const comandasFechadas = new Map<string, Record<string, any>>();
  for (const agenda of agendamentos) {
    const comanda = getRelationOne(agenda.comandas);
    const idComanda = String(comanda?.id || agenda.id_comanda || "");
    if (idComanda && isClosedComanda(comanda?.status)) {
      comandasFechadas.set(idComanda, comanda);
    }
  }
  const usosEfetivos = usosMetricas.filter((uso) => {
    const idComanda = String(uso.id_comanda || "");
    return !isCanceledStatus(uso.status) && idComanda && comandasFechadas.has(idComanda);
  });
  const usosPageEfetivos = usos.filter((uso) => {
    const comanda = getRelationOne(uso.comandas);
    return !isCanceledStatus(uso.status) && isClosedComanda(comanda?.status);
  }).slice(usosFrom, usosTo + 1);
  const descontoTotal = usosEfetivos.reduce((sum, uso) => sum + Number(uso.valor_desconto || 0), 0);
  const receitaGerada = agendamentos.reduce((sum, agenda) => {
    const comanda = getRelationOne(agenda.comandas);
    if (!isClosedComanda(comanda?.status)) return sum;
    const totalComanda = Number(comanda?.total ?? comanda?.subtotal ?? 0);
    return sum + (Number.isFinite(totalComanda) && totalComanda > 0 ? totalComanda : 0);
  }, 0);
  const clienteIdsCampanha = Array.from(
    new Set(agendamentos.map((agenda) => String(agenda.cliente_id || "")).filter(Boolean))
  ).slice(0, 500);
  const historicoClientesResult = clienteIdsCampanha.length
    ? await (supabase as any)
        .from("agendamentos")
        .select("id, cliente_id, data, created_at, status")
        .eq("id_salao", idSalao)
        .in("cliente_id", clienteIdsCampanha)
        .order("data", { ascending: true })
        .limit(5000)
    : { data: [] };
  const historicoComandasResult = clienteIdsCampanha.length
    ? await (supabase as any)
        .from("comandas")
        .select("id, id_cliente, status, created_at, fechada_em")
        .eq("id_salao", idSalao)
        .in("id_cliente", clienteIdsCampanha)
        .eq("status", "fechada")
        .order("created_at", { ascending: true })
        .limit(5000)
    : { data: [] };
  const historicoPorCliente = new Map<string, Array<Record<string, any>>>();
  for (const item of ((historicoClientesResult.data || []) as Array<Record<string, any>>)) {
    const idCliente = String(item.cliente_id || "");
    if (!idCliente || isCanceledStatus(item.status)) continue;
    historicoPorCliente.set(idCliente, [...(historicoPorCliente.get(idCliente) || []), item]);
  }
  const comandasPorCliente = new Map<string, Array<Record<string, any>>>();
  for (const item of ((historicoComandasResult.data || []) as Array<Record<string, any>>)) {
    const idCliente = String(item.id_cliente || "");
    if (!idCliente) continue;
    comandasPorCliente.set(idCliente, [...(comandasPorCliente.get(idCliente) || []), item]);
  }
  const clientesNovos = new Set<string>();
  const campanhaCriadaEm = toDateKey(campanhaResult.data.created_at);
  for (const agenda of agendamentos) {
    if (isCanceledStatus(agenda.status)) continue;
    const idCliente = String(agenda.cliente_id || "");
    if (!idCliente) continue;
    const dataAgenda = toDateKey(agenda.data || agenda.created_at);
    const historico = historicoPorCliente.get(idCliente) || [];
    const tinhaHistoricoAntes = historico.some((item) => {
      if (String(item.id || "") === String(agenda.id || "")) return false;
      const dataHistorico = toDateKey(item.data || item.created_at);
      return dataHistorico && dataAgenda && dataHistorico < dataAgenda;
    });
    const tinhaComandaFechadaAntes = (comandasPorCliente.get(idCliente) || []).some((item) => {
      const dataComanda = toDateKey(item.fechada_em || item.created_at);
      return dataComanda && dataAgenda && dataComanda < dataAgenda;
    });
    const cliente = getRelationOne(agenda.clientes);
    const clienteCriadoEm = toDateKey(cliente?.created_at);
    const clienteAntigoSemHistorico =
      clienteCriadoEm &&
      campanhaCriadaEm &&
      clienteCriadoEm < campanhaCriadaEm &&
      !tinhaHistoricoAntes &&
      !tinhaComandaFechadaAntes;

    if (!tinhaHistoricoAntes && !tinhaComandaFechadaAntes && !clienteAntigoSemHistorico) {
      clientesNovos.add(idCliente);
    }
  }
  const conversao = cliques > 0 ? Math.round((totalAgendamentos / cliques) * 100) : 0;
  const servicos = (servicosResult.data || []) as Array<Record<string, any>>;
  const servicosMaisVendidos = servicos.map((servico) => {
    const idServico = String(servico.id_servico || "");
    const total = usosEfetivos.filter((uso) => String(uso.metadata?.id_servico || "") === idServico).length;
    const rel = getRelationOne(servico.servicos);
    return { nome: String(rel?.nome || "Serviço"), total };
  });

  return {
    campanha: campanhaResult.data as Record<string, any>,
    servicos,
    usos: usosPageEfetivos,
    eventos,
    agendamentos,
    clientesPermitidos: (clientesPermitidosResult.data || []) as Array<Record<string, any>>,
    totalClientesPermitidos: Number(clientesPermitidosResult.count || 0),
    clientes: (clientesResult.data || []) as Array<Record<string, any>>,
    servicosDisponiveis: (servicosDisponiveisResult.data || []) as Array<Record<string, any>>,
    metricas: {
      totalUsos: usosEfetivos.length,
      totalUsosRegistrados: totalUsos,
      cliques,
      agendamentos: totalAgendamentos || agendamentosEvento || agendamentos.length,
      resgates,
      clientesNovos: clientesNovos.size,
      descontoTotal,
      receitaGerada,
      cancelados,
      conversao,
      servicosMaisVendidos,
    },
  };
}

export default async function CampanhaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    ok?: string | string[];
    erro?: string | string[];
    pagina_usos?: string | string[];
    pagina_clientes?: string | string[];
    busca_cliente?: string | string[];
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) redirect("/login");
  if (String(usuario.nivel || "").toLowerCase() !== "admin") redirect("/dashboard");

  const featureAccess = await canUsePlanFeature(usuario.id_salao, "campanhas");
  if (!featureAccess.allowed) {
    redirect(
      `/comparar-planos?recurso=campanhas&erro=${encodeURIComponent(
        featureAccess.reason || "Campanhas não está liberado no plano atual."
      )}`
    );
  }

  const paginaUsosParam = Array.isArray(query.pagina_usos) ? query.pagina_usos[0] : query.pagina_usos;
  const paginaClientesParam = Array.isArray(query.pagina_clientes) ? query.pagina_clientes[0] : query.pagina_clientes;
  const buscaClienteParam = Array.isArray(query.busca_cliente) ? query.busca_cliente[0] : query.busca_cliente;
  const buscaCliente = String(buscaClienteParam || "").trim();
  const paginaUsos = Math.max(0, Number(paginaUsosParam || 1) - 1);
  const paginaClientes = Math.max(0, Number(paginaClientesParam || 1) - 1);
  const usosPageSize = 10;
  const clientesPageSize = 10;
  const data = await loadCampanhaDetalhe(
    usuario.id_salao,
    id,
    paginaUsos,
    usosPageSize,
    paginaClientes,
    clientesPageSize,
    buscaCliente
  );
  if (!data) redirect("/campanhas?erro=Campanha%20nao%20encontrada.");

  const campanha = data.campanha;
  const link = campanha.slug
    ? `${siteUrl()}/campanha/${campanha.slug}`
    : `${siteUrl()}/resgatar-cupom/${campanha.resgate_token}`;
  const mensagemDivulgacao = [
    String(campanha.mensagem_cliente || campanha.descricao || `Você recebeu uma campanha especial: ${campanha.nome}`),
    "",
    "Resgate pelo link:",
    link,
  ].join("\n");
  const whatsappDivulgacaoUrl = `https://wa.me/?text=${encodeURIComponent(mensagemDivulgacao)}`;
  const statusAtual = String(campanha.status_campanha || "ativa");
  const statusReal = statusLabel(campanha, data.metricas.totalUsos);
  const ok = Array.isArray(query.ok) ? query.ok[0] : query.ok;
  const erro = Array.isArray(query.erro) ? query.erro[0] : query.erro;
  const servicosVinculadosMap = new Map(
    data.servicos.map((servico) => [String(servico.id_servico), servico])
  );
  const kpiCards = [
    { label: "Cliques", value: data.metricas.cliques, icon: Link2, hint: "Aberturas registradas no link da campanha." },
    { label: "Resgates", value: data.metricas.resgates, icon: Gift, hint: "Clientes que ativaram o cupom na conta." },
    { label: "Agendamentos", value: data.metricas.agendamentos, icon: CalendarDays, hint: "Reservas criadas com esta campanha." },
    { label: "Conversão", value: `${data.metricas.conversao}%`, icon: BarChart3, hint: "Agendamentos divididos pelos cliques." },
    { label: "Receita gerada", value: money(data.metricas.receitaGerada), icon: BarChart3, hint: "Soma das comandas fechadas originadas pela campanha." },
    { label: "Descontos", value: money(data.metricas.descontoTotal), icon: Gift, hint: "Uso = comanda fechada com cupom aplicado." },
    { label: "Clientes novos", value: data.metricas.clientesNovos, icon: Users, hint: "Cliente criado na campanha e sem agendamento ou comanda fechada anterior." },
    { label: "Cancelados", value: data.metricas.cancelados, icon: CalendarDays, hint: "Agendamentos da campanha cancelados." },
  ];
  const getUsosHref = (page: number) => {
    const params = new URLSearchParams();
    params.set("pagina_usos", String(page + 1));
    if (paginaClientes > 0) params.set("pagina_clientes", String(paginaClientes + 1));
    if (buscaCliente) params.set("busca_cliente", buscaCliente);
    return `/campanhas/${campanha.id}?${params.toString()}`;
  };
  const getClientesHref = (page: number) => {
    const params = new URLSearchParams();
    if (paginaUsos > 0) params.set("pagina_usos", String(paginaUsos + 1));
    params.set("pagina_clientes", String(page + 1));
    if (buscaCliente) params.set("busca_cliente", buscaCliente);
    return `/campanhas/${campanha.id}?${params.toString()}`;
  };

  return (
    <main className="space-y-6">
      <Link href="/campanhas" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950">
        <ArrowLeft size={16} /> Voltar
      </Link>

      {ok ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {ok}
        </p>
      ) : null}
      {erro ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {erro}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
              Relatório da campanha
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
        {kpiCards.map(({ label, value, icon: Icon, hint }) => (
          <div key={label} title={hint} className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <Icon className="text-amber-700" size={20} />
            <p className="mt-4 text-sm font-bold text-zinc-500">{String(label)}</p>
            <strong className="mt-1 block text-2xl font-black text-zinc-950">{String(value)}</strong>
            <p className="mt-2 min-h-10 text-xs font-semibold leading-5 text-zinc-500">{hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <form action={atualizarCampanhaAction} className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-2">
          <input type="hidden" name="id" value={String(campanha.id)} />
          <h2 className="text-xl font-black text-zinc-950">Editar campanha</h2>
          <p className="mt-1 text-sm text-zinc-500">Ajuste a campanha sem criar outra promocao.</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Nome
              <input name="titulo" defaultValue={String(campanha.nome || "")} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none focus:border-zinc-950" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Status
              <select name="status_campanha" defaultValue={statusAtual} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none">
                <option value="ativa">Ativa</option>
                <option value="pausada">Pausada</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Publico
              <select name="publico_tipo" defaultValue={String(campanha.publico_tipo || "link")} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none">
                <option value="link">Aberta pelo link</option>
                <option value="clientes_especificos">Clientes especificos</option>
                <option value="novos_clientes">Novos clientes</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Descrição interna
              <textarea name="descricao_interna" rows={3} defaultValue={String(campanha.descricao_interna || "")} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:border-zinc-950" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Mensagem para cliente
              <textarea name="mensagem_cliente" rows={3} defaultValue={String(campanha.mensagem_cliente || campanha.descricao || "")} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:border-zinc-950" />
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Início
              <input name="valido_de" type="date" defaultValue={String(campanha.valido_de || "").slice(0, 10)} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Fim
              <input name="valido_ate" type="date" defaultValue={String(campanha.valido_ate || "").slice(0, 10)} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Limite total
              <input name="limite_total" type="number" min="1" defaultValue={Number(campanha.limite_uso_total || 0) || ""} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Limite por cliente
              <input name="limite_cliente" type="number" min="1" defaultValue={Number(campanha.limite_uso_cliente || 1)} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Limite por dia
              <input name="limite_dia" type="number" min="1" defaultValue={Number(campanha.limite_uso_dia || 0) || ""} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
          </div>

          <button className="mt-5 h-12 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white" type="submit">
            Salvar campanha
          </button>
        </form>

        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Copy size={18} /> Link e divulgação
          </h2>
          <code className="mt-4 block truncate rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
            {link}
          </code>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">WhatsApp manual</p>
                <p className="mt-1 text-sm font-bold text-emerald-950">
                  Mensagem pronta para copiar ou abrir direto no WhatsApp.
                </p>
              </div>
              <a
                href={whatsappDivulgacaoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
              >
                <MessageCircle size={17} /> Abrir WhatsApp
              </a>
            </div>
            <textarea
              readOnly
              rows={5}
              value={mensagemDivulgacao}
              className="mt-4 w-full resize-none rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold leading-6 text-zinc-700 outline-none"
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Status</p>
              <strong className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(statusReal)}`}>
                {statusReal}
              </strong>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Validade</p>
              <strong>{formatDate(campanha.valido_de)} até {formatDate(campanha.valido_ate)}</strong>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Limites</p>
              <strong>{Number(campanha.limite_uso_total || 0) || "sem"} total</strong>
            </div>
          </div>
          <form action={auditarCampanhasAction} className="mt-4">
            <button type="submit" className="h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950 transition hover:bg-zinc-50">
              Auditar campanhas antigas
            </button>
          </form>
        </div>

        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Scissors size={18} /> Serviços vinculados
          </h2>
          <div className="mt-4 space-y-3">
            {data.servicos.map((servico) => {
              const rel = Array.isArray(servico.servicos) ? servico.servicos[0] : servico.servicos;
              return (
                <div key={String(servico.id_servico)} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                  <strong className="text-zinc-950">{String(rel?.nome || "Serviço")}</strong>
                  <p className="mt-1 text-sm text-zinc-500">
                    {String(servico.tipo_beneficio || "benefício")} · {Number(servico.valor_beneficio || 0)}
                    {servico.limite_uso_servico ? ` · limite ${servico.limite_uso_servico}` : ""}
                  </p>
                </div>
              );
            })}
            {!data.servicos.length ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                  Nenhum serviço vinculado.
              </p>
            ) : null}
          </div>
        </div>

        <form action={atualizarServicosCampanhaAction} className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-2">
          <input type="hidden" name="id_campanha" value={String(campanha.id)} />
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Scissors size={18} /> Editar serviços permitidos
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Marque os serviços que aparecem na página pública da campanha e ajuste o benefício.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {data.servicosDisponiveis.map((servico) => {
              const vinculo = servicosVinculadosMap.get(String(servico.id));
              const preco = Number(servico.preco_padrao ?? servico.preco ?? 0);
              return (
                <label key={String(servico.id)} className="block rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      name="servicos"
                      value={String(servico.id)}
                      type="checkbox"
                      defaultChecked={Boolean(vinculo)}
                      className="mt-1 h-4 w-4 accent-zinc-950"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <strong className="truncate text-zinc-950">{String(servico.nome || "Serviço")}</strong>
                        <span className="text-xs font-black text-zinc-500">{money(preco)}</span>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <select
                          name={`beneficio_tipo_${servico.id}`}
                          defaultValue={String(vinculo?.tipo_beneficio || "desconto_percentual")}
                          className="h-10 rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold"
                        >
                          <option value="desconto_percentual">Desconto %</option>
                          <option value="desconto_valor">Desconto R$</option>
                          <option value="preco_fixo">Preco fixo</option>
                          <option value="brinde">Brinde</option>
                        </select>
                        <input
                          name={`beneficio_valor_${servico.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={vinculo?.valor_beneficio ?? ""}
                          className="h-10 rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold"
                          placeholder="Valor"
                        />
                        <input
                          name={`limite_servico_${servico.id}`}
                          type="number"
                          min="1"
                          defaultValue={vinculo?.limite_uso_servico ?? ""}
                          className="h-10 rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold"
                          placeholder="Limite"
                        />
                      </div>
                      <input
                        name={`beneficio_brinde_${servico.id}`}
                        defaultValue={String(vinculo?.brinde_descricao || "")}
                        className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold"
                        placeholder="Descrição do brinde, se houver"
                      />
                    </div>
                  </div>
                </label>
              );
            })}
            {!data.servicosDisponiveis.length ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                  Nenhum serviço ativo encontrado.
              </p>
            ) : null}
          </div>
          <button className="mt-4 h-11 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white" type="submit">
            Salvar serviços
          </button>
        </form>

        <form action={excluirCampanhaAction} className="rounded-[1.75rem] border border-red-200 bg-red-50 p-5 shadow-sm xl:col-span-2">
          <input type="hidden" name="id_campanha" value={String(campanha.id)} />
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-xl font-black text-red-800">Excluir campanha</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-red-700">
                Remove o link, os serviços vinculados, clientes permitidos, resgates e eventos da campanha. Agendamentos que já usaram o cupom ficam preservados, mas sem vínculo ativo com esta campanha.
              </p>
              <label className="mt-4 grid max-w-sm gap-2 text-sm font-black text-red-800">
                Digite EXCLUIR para confirmar
                <input
                  name="confirmacao"
                  className="h-12 rounded-2xl border border-red-200 bg-white px-4 text-sm font-black uppercase outline-none focus:border-red-700"
                  placeholder="EXCLUIR"
                />
              </label>
            </div>
            <button className="h-12 rounded-2xl bg-red-700 px-5 text-sm font-black text-white hover:bg-red-800" type="submit">
              Excluir campanha
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Users size={18} /> Clientes permitidos
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Use quando o público da campanha estiver como clientes específicos. Busque, confira o contato e adicione com um clique.
          </p>

          <form method="GET" className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            {paginaUsos > 0 ? <input type="hidden" name="pagina_usos" value={String(paginaUsos + 1)} /> : null}
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                name="busca_cliente"
                defaultValue={buscaCliente}
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm font-bold outline-none focus:border-zinc-950"
                placeholder="Nome, telefone, WhatsApp ou e-mail"
              />
            </label>
            <button className="h-12 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white" type="submit">
              Buscar
            </button>
          </form>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {data.clientes.map((cliente) => (
              <form
                key={String(cliente.id)}
                action={adicionarClienteCampanhaAction}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3"
              >
                <input type="hidden" name="id_campanha" value={String(campanha.id)} />
                <input type="hidden" name="id_cliente" value={String(cliente.id)} />
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-zinc-950">{String(cliente.nome || "Cliente")}</strong>
                  <span className="block truncate text-xs font-bold text-zinc-500">
                    {String(cliente.telefone || cliente.whatsapp || cliente.email || "Sem contato")}
                  </span>
                </div>
                <button
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-zinc-950 px-3 text-xs font-black text-white"
                  type="submit"
                >
                  <UserPlus size={14} /> Adicionar
                </button>
              </form>
            ))}
          </div>
          {!data.clientes.length ? (
            <p className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-bold text-zinc-600">
              {buscaCliente
                ? "Nenhum cliente encontrado. Tente nome, telefone, WhatsApp ou e-mail."
                : "Digite uma busca ou escolha um cliente recente para liberar esta campanha."}
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.clientesPermitidos.map((row) => {
              const cliente = Array.isArray(row.clientes) ? row.clientes[0] : row.clientes;
              const whatsapp = normalizeWhatsApp(cliente?.whatsapp || cliente?.telefone);
              const mensagemCliente = [
                `Oi, ${String(cliente?.nome || "tudo bem")}.`,
                String(campanha.mensagem_cliente || campanha.descricao || `Você recebeu uma campanha especial: ${campanha.nome}`),
                "",
                "Resgate pelo link:",
                link,
              ].join("\n");
              const whatsappClienteUrl = whatsapp
                ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagemCliente)}`
                : whatsappDivulgacaoUrl;
              return (
                <div key={String(row.id_cliente)} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-zinc-950">{String(cliente?.nome || "Cliente")}</strong>
                    <span className="text-xs font-bold text-zinc-500">{String(cliente?.telefone || cliente?.whatsapp || cliente?.email || "")}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={whatsappClienteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700"
                    >
                      <MessageCircle size={14} /> Enviar
                    </a>
                    <form action={removerClienteCampanhaAction}>
                      <input type="hidden" name="id_campanha" value={String(campanha.id)} />
                      <input type="hidden" name="id_cliente" value={String(row.id_cliente)} />
                      <button className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600" type="submit">
                        Remover
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
            {!data.clientesPermitidos.length ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                Nenhum cliente específico adicionado.
              </p>
            ) : null}
          </div>
          <PaginationLinks
            currentPage={paginaClientes}
            pageSize={clientesPageSize}
            totalItems={data.totalClientesPermitidos}
            getHref={getClientesHref}
            className="mt-4"
          />
        </div>

        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Users size={18} /> Clientes que usaram
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
            {data.usos.map((uso) => {
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
          <PaginationLinks
            currentPage={paginaUsos}
            pageSize={usosPageSize}
            totalItems={data.metricas.totalUsos}
            getHref={getUsosHref}
            className="mt-4"
          />
        </div>

        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <BarChart3 size={18} /> Serviços mais vendidos
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
                  Sem dados de serviço ainda.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
