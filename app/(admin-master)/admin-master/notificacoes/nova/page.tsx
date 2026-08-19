import Link from "next/link";
import {
  BellRing,
  MonitorSmartphone,
  SendHorizontal,
  ShieldAlert,
} from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  dispararNotificacaoAdminMasterAction,
  publicarAvisoVisualClienteAction,
} from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  ok?: string;
  erro?: string;
}>;

export default async function AdminMasterNovaNotificacaoPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requireAdminMasterUser("notificacoes_editar");
  const params = searchParams ? await searchParams : {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-400">
            Comunicação
          </div>
          <h1 className="mt-2 font-display text-3xl font-black tracking-[-0.04em] text-zinc-950">
            Nova comunicação
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            Publique avisos visuais dentro do App Cliente ou envie push para a
            barra de notificações do aparelho. Os dois canais são independentes.
          </p>
        </div>

        <Link
          href="/admin-master/notificacoes"
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
        >
          Voltar
        </Link>
      </div>

      {params.ok ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {params.ok}
        </div>
      ) : null}

      {params.erro ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {params.erro}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <form
          action={publicarAvisoVisualClienteAction}
          className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-950">
              <MonitorSmartphone size={22} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                App Cliente
              </div>
              <h2 className="mt-1 font-display text-xl font-black text-zinc-950">
                Aviso visual dentro do app
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Ideal para manutenção, comunicados, alertas e campanhas que
                precisam aparecer mesmo sem depender da permissão de push.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block text-sm font-bold text-zinc-700">
              Título
              <input
                name="visual_title"
                required
                maxLength={80}
                defaultValue="Estamos em manutenção"
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
                defaultValue="Estamos realizando uma manutenção para melhorar sua experiência. Voltaremos em breve."
                className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                Tipo
                <select
                  name="visual_type"
                  defaultValue="manutencao"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-400"
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
                  defaultValue="modal"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-400"
                >
                  <option value="modal">Modal central</option>
                  <option value="banner">Banner no topo</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                Início — horário de Brasília
                <input
                  type="datetime-local"
                  name="visual_starts_at"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                />
                <span className="mt-1 block text-xs font-medium text-zinc-400">
                  Vazio = publicar agora.
                </span>
              </label>

              <label className="block text-sm font-bold text-zinc-700">
                Término — horário de Brasília
                <input
                  type="datetime-local"
                  name="visual_ends_at"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                />
                <span className="mt-1 block text-xs font-medium text-zinc-400">
                  Vazio = permanece ativo até encerrar no Admin Master.
                </span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                Link do botão (opcional)
                <input
                  name="visual_url"
                  placeholder="/app-cliente/inicio"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-400"
                />
              </label>

              <label className="block text-sm font-bold text-zinc-700">
                Texto do botão
                <input
                  name="visual_button_text"
                  maxLength={40}
                  placeholder="Ver agora"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-400"
                />
              </label>
            </div>

            <label className="block text-sm font-bold text-zinc-700">
              Prioridade
              <select
                name="visual_priority"
                defaultValue="50"
                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-400"
              >
                <option value="0">Normal</option>
                <option value="50">Alta</option>
                <option value="100">Crítica</option>
              </select>
            </label>

            <div className="grid gap-3 rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
              <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  name="visual_dismissible"
                  defaultChecked
                  className="mt-1 h-4 w-4 rounded border-zinc-300"
                />
                <span>
                  Cliente pode fechar o aviso
                  <span className="mt-1 block text-xs font-medium leading-5 text-zinc-400">
                    Ao fechar, o sistema registra a dispensa e não mostra
                    novamente para aquela conta.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  name="visual_blocking"
                  className="mt-1 h-4 w-4 rounded border-zinc-300"
                />
                <span>
                  Bloquear o uso do App Cliente
                  <span className="mt-1 block text-xs font-medium leading-5 text-zinc-400">
                    Para manutenção crítica. Força modal obrigatório, sem botão
                    de fechar, até o aviso terminar ou ser encerrado.
                  </span>
                </span>
              </label>
            </div>

            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white transition hover:bg-zinc-800">
              <ShieldAlert size={18} />
              Publicar aviso visual
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <aside className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-800">
              Como funciona
            </div>
            <div className="mt-4 rounded-[22px] bg-zinc-950 p-5 text-white">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                SalãoPremium
              </div>
              <div className="mt-2 text-xl font-black">
                Estamos em manutenção
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                O aviso aparece dentro do App Cliente e é atualizado
                automaticamente quando o app está aberto ou volta ao foco.
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-amber-950/70">
              Avisos visuais não dependem da permissão de notificações do
              Android/iPhone. O Admin Master pode agendar, editar ou encerrar.
            </p>
          </aside>

          <form
            action={dispararNotificacaoAdminMasterAction}
            className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                <BellRing size={20} />
              </div>
              <div>
                <h2 className="font-display text-lg font-black text-zinc-950">
                  Push do aparelho
                </h2>
                <p className="text-sm text-zinc-500">
                  Continua disponível como canal separado.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block text-sm font-bold text-zinc-700">
                Público
                <select
                  name="target"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-400"
                  defaultValue="todos"
                >
                  <option value="todos">Todos os aparelhos ativos</option>
                  <option value="clientes">Clientes do app cliente</option>
                  <option value="profissionais">Profissionais do app profissional</option>
                  <option value="saloes">Painel dos salões</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-zinc-700">
                ID do salão (opcional)
                <input
                  name="id_salao"
                  placeholder="Somente para um salão específico"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-400"
                />
              </label>

              <label className="block text-sm font-bold text-zinc-700">
                Título
                <input
                  name="title"
                  required
                  maxLength={80}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-400"
                />
              </label>

              <label className="block text-sm font-bold text-zinc-700">
                Mensagem
                <textarea
                  name="body"
                  required
                  rows={4}
                  maxLength={220}
                  className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
                />
              </label>

              <label className="block text-sm font-bold text-zinc-700">
                Link ao tocar
                <input
                  name="url"
                  defaultValue="/app-cliente/inicio"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-400"
                />
              </label>

              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white transition hover:bg-zinc-800">
                <SendHorizontal size={18} />
                Enviar push
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
