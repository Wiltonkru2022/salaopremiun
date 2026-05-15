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
  Scissors,
  Users,
} from "lucide-react";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  adicionarClienteCampanhaAction,
  atualizarCampanhaAction,
  atualizarServicosCampanhaAction,
  atualizarStatusCampanhaAction,
  removerClienteCampanhaAction,
} from "../actions";

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

function normalizeWhatsApp(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

async function loadCampanhaDetalhe(idSalao: string, id: string) {
  const supabase = getSupabaseAdmin();
  const [
    campanhaResult,
    servicosResult,
    usosResult,
    eventosResult,
    agendamentosResult,
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
    (supabase as any)
      .from("cupom_salao_clientes")
      .select("id_cliente, clientes(id, nome, telefone, email, whatsapp)")
      .eq("id_salao", idSalao)
      .eq("id_cupom", id)
      .limit(300),
    (supabase as any)
      .from("clientes")
      .select("id, nome, telefone, email, whatsapp")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .limit(300),
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
    clientesPermitidos: (clientesPermitidosResult.data || []) as Array<Record<string, any>>,
    clientes: (clientesResult.data || []) as Array<Record<string, any>>,
    servicosDisponiveis: (servicosDisponiveisResult.data || []) as Array<Record<string, any>>,
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string | string[]; erro?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) redirect("/login");
  if (String(usuario.nivel || "").toLowerCase() !== "admin") redirect("/dashboard");

  const data = await loadCampanhaDetalhe(usuario.id_salao, id);
  if (!data) redirect("/campanhas?erro=Campanha%20nao%20encontrada.");

  const campanha = data.campanha;
  const link = campanha.slug
    ? `${siteUrl()}/campanha/${campanha.slug}`
    : `${siteUrl()}/resgatar-cupom/${campanha.resgate_token}`;
  const mensagemDivulgacao = [
    String(campanha.mensagem_cliente || campanha.descricao || `Voce recebeu uma campanha especial: ${campanha.nome}`),
    "",
    "Resgate pelo link:",
    link,
  ].join("\n");
  const whatsappDivulgacaoUrl = `https://wa.me/?text=${encodeURIComponent(mensagemDivulgacao)}`;
  const statusAtual = String(campanha.status_campanha || "ativa");
  const ok = Array.isArray(query.ok) ? query.ok[0] : query.ok;
  const erro = Array.isArray(query.erro) ? query.erro[0] : query.erro;
  const servicosVinculadosMap = new Map(
    data.servicos.map((servico) => [String(servico.id_servico), servico])
  );
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
              Descricao interna
              <textarea name="descricao_interna" rows={3} defaultValue={String(campanha.descricao_interna || "")} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:border-zinc-950" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Mensagem para cliente
              <textarea name="mensagem_cliente" rows={3} defaultValue={String(campanha.mensagem_cliente || campanha.descricao || "")} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:border-zinc-950" />
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Inicio
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
            <Copy size={18} /> Link e divulgacao
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

        <form action={atualizarServicosCampanhaAction} className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-2">
          <input type="hidden" name="id_campanha" value={String(campanha.id)} />
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Scissors size={18} /> Editar servicos permitidos
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Marque os servicos que aparecem na pagina publica da campanha e ajuste o beneficio.
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
                        <strong className="truncate text-zinc-950">{String(servico.nome || "Servico")}</strong>
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
                        placeholder="Descricao do brinde, se houver"
                      />
                    </div>
                  </div>
                </label>
              );
            })}
            {!data.servicosDisponiveis.length ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                Nenhum servico ativo encontrado.
              </p>
            ) : null}
          </div>
          <button className="mt-4 h-11 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white" type="submit">
            Salvar servicos
          </button>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-950">
            <Users size={18} /> Clientes permitidos
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Use quando o publico da campanha estiver como clientes especificos.
          </p>

          <form action={adicionarClienteCampanhaAction} className="mt-4 flex flex-col gap-3 md:flex-row">
            <input type="hidden" name="id_campanha" value={String(campanha.id)} />
            <select name="id_cliente" className="h-12 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none">
              <option value="">Selecionar cliente</option>
              {data.clientes.map((cliente) => (
                <option key={String(cliente.id)} value={String(cliente.id)}>
                  {String(cliente.nome || "Cliente")} {cliente.telefone ? `- ${cliente.telefone}` : ""}
                </option>
              ))}
            </select>
            <button className="h-12 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white" type="submit">
              Adicionar
            </button>
          </form>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.clientesPermitidos.map((row) => {
              const cliente = Array.isArray(row.clientes) ? row.clientes[0] : row.clientes;
              const whatsapp = normalizeWhatsApp(cliente?.whatsapp || cliente?.telefone);
              const mensagemCliente = [
                `Oi, ${String(cliente?.nome || "tudo bem")}.`,
                String(campanha.mensagem_cliente || campanha.descricao || `Voce recebeu uma campanha especial: ${campanha.nome}`),
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
                Nenhum cliente especifico adicionado.
              </p>
            ) : null}
          </div>
        </div>

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
