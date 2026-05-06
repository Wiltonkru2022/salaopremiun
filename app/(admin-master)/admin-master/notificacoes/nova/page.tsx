import Link from "next/link";
import { BellRing, SendHorizontal } from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { dispararNotificacaoAdminMasterAction } from "../actions";

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-400">
            Comunicacao
          </div>
          <h1 className="mt-2 font-display text-3xl font-black tracking-[-0.04em] text-zinc-950">
            Disparar notificacao
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Envie avisos para a barra do celular de clientes, profissionais ou
            saloes que ja ativaram notificacoes no app.
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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          action={dispararNotificacaoAdminMasterAction}
          className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <BellRing size={20} />
            </div>
            <div>
              <h2 className="font-display text-xl font-black text-zinc-950">
                Nova mensagem push
              </h2>
              <p className="text-sm text-zinc-500">
                O envio e imediato para inscricoes ativas.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block text-sm font-bold text-zinc-700">
              Publico
              <select
                name="target"
                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-400"
                defaultValue="todos"
              >
                <option value="todos">Todos os aparelhos ativos</option>
                <option value="clientes">Clientes do app cliente</option>
                <option value="profissionais">Profissionais do app profissional</option>
                <option value="saloes">Painel dos saloes</option>
              </select>
            </label>

            <label className="block text-sm font-bold text-zinc-700">
              ID do salao (opcional)
              <input
                name="id_salao"
                placeholder="Use apenas para disparo de um salao especifico"
                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-400"
              />
            </label>

            <label className="block text-sm font-bold text-zinc-700">
              Titulo
              <input
                name="title"
                required
                maxLength={80}
                defaultValue="Dia das maes chegou"
                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-400"
              />
            </label>

            <label className="block text-sm font-bold text-zinc-700">
              Mensagem
              <textarea
                name="body"
                required
                rows={5}
                maxLength={220}
                defaultValue="Voce ja agendou seu horario hoje? Da uma olhadinha no app, temos novidades."
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
              Enviar notificacao
            </button>
          </div>
        </form>

        <aside className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-5">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
            Exemplo
          </div>
          <div className="mt-4 rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-black text-zinc-950">
              Dia das maes chegou
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Voce ja agendou seu horario hoje? Da uma olhadinha no app, temos
              novidades.
            </p>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-500">
            O sistema operacional pode mostrar a origem do app abaixo da
            notificacao. O texto principal acima fica sob nosso controle.
          </p>
        </aside>
      </section>
    </div>
  );
}
