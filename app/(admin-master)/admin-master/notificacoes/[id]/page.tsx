import Link from "next/link";
import { notFound } from "next/navigation";
import AdminMasterDataTableClient from "@/components/admin-master/AdminMasterDataTableClient";
import AdminMasterPageHeader, { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  formatSaoPauloDateTimeLocal,
  parseClientVisualNoticeConfig,
} from "@/lib/client-app/visual-notifications";
import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  atualizarAvisoVisualClienteAction,
  encerrarAvisoVisualClienteAction,
} from "../actions";

function dateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; erro?: string }>;

export default async function AdminMasterNotificacaoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: SearchParams;
}) {
  await requireAdminMasterUser("comunicacao_ver");
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = getDatabaseAdmin() as any;

  const [
    { data: notificacao },
    { data: destinos },
    { data: clientStates },
  ] = await Promise.all([
    supabase
      .from("notificacoes_globais")
      .select(
        "id, titulo, descricao, tipo, publico_tipo, filtros_json, status, agendada_em, enviada_em, criada_em, link_url, imagem_url"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("notificacoes_destinos")
      .select("id, id_salao, status, entregue_em, lida_em, clicada_em")
      .eq("id_notificacao", id)
      .limit(500),
    supabase
      .from("notificacoes_cliente_estado")
      .select(
        "id, cliente_app_conta_id, exibida_em, lida_em, dispensada_em, clicada_em, atualizado_em"
      )
      .eq("id_notificacao", id)
      .order("atualizado_em", { ascending: false })
      .limit(500),
  ]);

  if (!notificacao?.id) notFound();

  const visualConfig = parseClientVisualNoticeConfig(notificacao.filtros_json);
  const isVisual = Boolean(visualConfig);

  const pushRows = ((destinos || []) as Array<Record<string, unknown>>).map((item) => ({
    destino: String(item.id_salao || "-"),
    status: String(item.status || "-"),
    entregue: dateTime(String(item.entregue_em || "")),
    lida: dateTime(String(item.lida_em || "")),
    clique: dateTime(String(item.clicada_em || "")),
  }));

  const visualRows = ((clientStates || []) as Array<Record<string, unknown>>).map(
    (item) => ({
      cliente: String(item.cliente_app_conta_id || "-"),
      exibida: dateTime(String(item.exibida_em || "")),
      lida: dateTime(String(item.lida_em || "")),
      dispensada: dateTime(String(item.dispensada_em || "")),
      clique: dateTime(String(item.clicada_em || "")),
    })
  );

  const rows = isVisual ? visualRows : pushRows;
  const total = rows.length;
  const shown = isVisual
    ? visualRows.filter((row) => row.exibida !== "-").length
    : pushRows.filter((row) => row.entregue !== "-").length;
  const read = rows.filter((row) => row.lida !== "-").length;
  const clicks = rows.filter((row) => row.clique !== "-").length;
  const dismissed = isVisual
    ? visualRows.filter((row) => row.dispensada !== "-").length
    : pushRows.filter((row) => /erro|falha|failed/i.test(String(row.status))).length;

  return (
    <div className="space-y-6">
      <AdminMasterPageHeader
        eyebrow={isVisual ? "Aviso visual · App Cliente" : "Notificação push"}
        title={String(notificacao.titulo || "Notificação")}
        description={String(notificacao.descricao || "Detalhe operacional do disparo, leitura, cliques e falhas.")}
        breadcrumb={[
          { label: "Admin Master", href: "/admin-master" },
          { label: "Comunicação", href: "/admin-master/notificacoes" },
          { label: "Detalhe" },
        ]}
        actions={<>
          <Link href="/admin-master/notificacoes/nova" className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700">Nova comunicação</Link>
          <Link href="/admin-master/notificacoes" className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:border-violet-200 hover:text-violet-700">Voltar</Link>
        </>}
      />

      {query.ok ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {query.ok}
        </div>
      ) : null}
      {query.erro ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {query.erro}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMasterMetricCard
          label={isVisual ? "Contas alcançadas" : "Destinos"}
          value={String(total)}
          hint={String(notificacao.publico_tipo || "-")}
        />
        <AdminMasterMetricCard
          label={isVisual ? "Exibições" : "Entregues"}
          value={String(shown)}
          hint={String(notificacao.status || "-")}
        />
        <AdminMasterMetricCard
          label="Lidas"
          value={String(read)}
          hint={`${total ? Math.round((read / total) * 100) : 0}% de leitura`}
        />
        <AdminMasterMetricCard
          label="Cliques"
          value={String(clicks)}
          hint={String(notificacao.link_url || "Sem link")}
        />
        <AdminMasterMetricCard
          label={isVisual ? "Dispensadas" : "Falhas"}
          value={String(dismissed)}
          hint={isVisual ? "Clientes que fecharam" : "Destinos com erro"}
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 text-sm text-zinc-600 md:grid-cols-2 xl:grid-cols-5">
          <div><span className="font-bold text-zinc-950">Tipo:</span> {String(notificacao.tipo || "-")}</div>
          <div><span className="font-bold text-zinc-950">Status:</span> {String(notificacao.status || "-")}</div>
          <div><span className="font-bold text-zinc-950">Criada:</span> {dateTime(notificacao.criada_em)}</div>
          <div><span className="font-bold text-zinc-950">Início:</span> {dateTime(notificacao.agendada_em)}</div>
          <div><span className="font-bold text-zinc-950">Publicada:</span> {dateTime(notificacao.enviada_em)}</div>
        </div>
      </section>

      {isVisual && visualConfig ? (
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                Controle do Admin Master
              </div>
              <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
                Editar aviso visual
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Alterações passam a valer quando o App Cliente atualizar o aviso,
                voltar ao foco ou em até cerca de um minuto.
              </p>
            </div>

            {String(notificacao.status || "").toLowerCase() !== "encerrada" ? (
              <form action={encerrarAvisoVisualClienteAction}>
                <input type="hidden" name="id" value={id} />
                <button className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 transition hover:bg-rose-100">
                  Encerrar aviso
                </button>
              </form>
            ) : null}
          </div>

          <form action={atualizarAvisoVisualClienteAction} className="mt-6 grid gap-4">
            <input type="hidden" name="id" value={id} />

            <label className="block text-sm font-bold text-zinc-700">
              Título
              <input
                name="visual_title"
                required
                maxLength={80}
                defaultValue={String(notificacao.titulo || "")}
                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-400"
              />
            </label>

            <label className="block text-sm font-bold text-zinc-700">
              Mensagem
              <textarea
                name="visual_body"
                required
                rows={4}
                maxLength={500}
                defaultValue={String(notificacao.descricao || "")}
                className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm font-bold text-zinc-700">
                Tipo
                <select
                  name="visual_type"
                  defaultValue={String(notificacao.tipo || "informacao")}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800"
                >
                  <option value="manutencao">Manutenção</option>
                  <option value="informacao">Informação</option>
                  <option value="aviso">Aviso importante</option>
                  <option value="promocao">Promoção</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-zinc-700">
                Exibição
                <select
                  name="visual_presentation"
                  defaultValue={visualConfig.apresentacao}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800"
                >
                  <option value="modal">Modal central</option>
                  <option value="banner">Banner no topo</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-zinc-700">
                Prioridade
                <select
                  name="visual_priority"
                  defaultValue={String(visualConfig.prioridade)}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800"
                >
                  <option value="0">Normal</option>
                  <option value="50">Alta</option>
                  <option value="100">Crítica</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-zinc-700">
                Texto do botão
                <input
                  name="visual_button_text"
                  maxLength={40}
                  defaultValue={visualConfig.botao_texto || ""}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                Início — Brasília
                <input
                  type="datetime-local"
                  name="visual_starts_at"
                  defaultValue={formatSaoPauloDateTimeLocal(notificacao.agendada_em)}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm"
                />
              </label>
              <label className="block text-sm font-bold text-zinc-700">
                Término — Brasília
                <input
                  type="datetime-local"
                  name="visual_ends_at"
                  defaultValue={formatSaoPauloDateTimeLocal(visualConfig.fim_em)}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                Link interno
                <input
                  name="visual_url"
                  defaultValue={String(notificacao.link_url || "")}
                  placeholder="/app-cliente/inicio"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm"
                />
              </label>

              <div className="grid gap-3 rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
                <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    name="visual_dismissible"
                    defaultChecked={visualConfig.dispensavel}
                    className="mt-1 h-4 w-4 rounded border-zinc-300"
                  />
                  Cliente pode fechar
                </label>
                <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    name="visual_blocking"
                    defaultChecked={visualConfig.bloqueante}
                    className="mt-1 h-4 w-4 rounded border-zinc-300"
                  />
                  Bloquear uso do app
                </label>
              </div>
            </div>

            <button className="min-h-12 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white transition hover:bg-zinc-800">
              Salvar e publicar alterações
            </button>
          </form>
        </section>
      ) : null}

      <AdminMasterDataTableClient
        rows={rows}
        columns={isVisual ? ["cliente", "exibida", "lida", "dispensada", "clique"] : ["destino", "status", "entregue", "lida", "clique"]}
        emptyTitle="Nenhum destino encontrado"
        emptyDescription="Os resultados de entrega e interação aparecerão aqui."
      />
    </div>
  );
}
