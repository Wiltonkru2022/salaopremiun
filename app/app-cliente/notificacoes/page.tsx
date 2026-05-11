import Link from "next/link";
import { ArrowLeft, Bell, CalendarDays, CheckCircle2 } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import {
  markAllClienteNotificationsReadAction,
  markClienteNotificationReadAction,
  markClienteNotificationUnreadAction,
} from "@/app/app-cliente/notificacoes/actions";
import { listClienteAppNotifications } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

export const metadata = {
  title: "Notificacoes | SalaoPremium",
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function notificationIcon(tipo: string) {
  const normalized = tipo.toLowerCase();
  if (normalized.includes("lembrete") || normalized.includes("agenda")) {
    return CalendarDays;
  }
  if (normalized.includes("finalizado") || normalized.includes("avaliar")) {
    return CheckCircle2;
  }
  return Bell;
}

function buildNotificationsHref(tab: string, page: number) {
  return `/app-cliente/notificacoes?aba=${tab}&pagina=${page + 1}`;
}

function FilterLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black transition ${
        active
          ? "bg-zinc-950 text-white"
          : "border border-zinc-200 bg-white text-zinc-700"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-500"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

export default async function ClienteNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ aba?: string; pagina?: string }>;
}) {
  const session = await requireClienteAppContext();
  const params = searchParams ? await searchParams : undefined;
  const activeTab = params?.aba === "lidas" ? "lidas" : "nao-lidas";
  const currentPage = Math.max(0, Number(params?.pagina || 1) - 1);
  const pageSize = 10;
  const [currentResult, unreadCounter, readCounter] = await Promise.all([
    listClienteAppNotifications({
      idConta: session.idConta,
      read: activeTab === "lidas",
      page: currentPage,
      limit: pageSize,
    }),
    listClienteAppNotifications({
      idConta: session.idConta,
      read: false,
      page: 0,
      limit: 1,
    }),
    listClienteAppNotifications({
      idConta: session.idConta,
      read: true,
      page: 0,
      limit: 1,
    }),
  ]);
  const notifications = currentResult.items;
  const hasMore = currentResult.hasMore;

  return (
    <ClientAppFrame title="Notificacoes" subtitle="Tudo que importa do seu atendimento.">
      <section className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <Link
          href="/app-cliente/perfil"
          className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-zinc-950">
              Central de notificacoes
            </h1>
            <p className="mt-2 text-base leading-7 text-zinc-500">
              Confirmacoes, lembretes, cancelamentos e pedidos de avaliacao ficam reunidos aqui.
            </p>
          </div>
          {activeTab === "nao-lidas" && unreadCounter.total > 0 ? (
            <form action={markAllClienteNotificationsReadAction}>
              <button className="h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800">
                Marcar todas como lidas
              </button>
            </form>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <FilterLink
            href="/app-cliente/notificacoes?aba=nao-lidas"
            active={activeTab === "nao-lidas"}
            label="Nao lidas"
            count={unreadCounter.total}
          />
          <FilterLink
            href="/app-cliente/notificacoes?aba=lidas"
            active={activeTab === "lidas"}
            label="Ja lidas"
            count={readCounter.total}
          />
        </div>

        {notifications.length ? (
          <div className="mt-7 space-y-3">
            {notifications.map((notification) => {
              const Icon = notificationIcon(notification.tipo);
              const isRead = Boolean(notification.lidaEm);
              return (
                <article
                  key={notification.id}
                  className={`rounded-[1.4rem] border bg-white p-4 shadow-sm transition ${
                    isRead ? "border-zinc-200" : "border-cyan-200"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        isRead
                          ? "bg-zinc-100 text-zinc-950"
                          : "bg-cyan-50 text-cyan-800"
                      }`}
                    >
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-base font-black text-zinc-950">
                          {notification.titulo}
                        </h2>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            isRead
                              ? "bg-zinc-100 text-zinc-500"
                              : "bg-cyan-50 text-cyan-800"
                          }`}
                        >
                          {isRead ? "Lida" : "Nova"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        {notification.mensagem}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-zinc-400">
                        {formatDate(notification.createdAt || notification.enviarEm)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 pl-0 sm:pl-15">
                    {notification.url ? (
                      <Link
                        href={notification.url}
                        className="inline-flex h-10 items-center rounded-xl bg-zinc-950 px-4 text-sm font-black text-white"
                      >
                        Abrir
                      </Link>
                    ) : null}
                    {isRead ? (
                      <form action={markClienteNotificationUnreadAction}>
                        <input
                          type="hidden"
                          name="notificacao"
                          value={notification.id}
                        />
                        <button className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800">
                          Marcar como nao lida
                        </button>
                      </form>
                    ) : (
                      <form action={markClienteNotificationReadAction}>
                        <input
                          type="hidden"
                          name="notificacao"
                          value={notification.id}
                        />
                        <button className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800">
                          Marcar como lida
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-zinc-200 bg-zinc-50 text-zinc-300">
              <Bell size={54} />
            </div>
            <h2 className="text-2xl font-black text-zinc-800">
              {activeTab === "lidas" ? "Nenhuma notificacao lida" : "Nada novo por enquanto"}
            </h2>
            <p className="mt-3 max-w-md text-base leading-7 text-zinc-500">
              {activeTab === "lidas"
                ? "Quando voce marcar avisos como lidos, eles ficam guardados aqui."
                : "Quando o salao confirmar, reagendar ou finalizar um atendimento, voce recebe o aviso aqui."}
            </p>
          </div>
        )}

        {notifications.length || hasMore || currentPage > 0 ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-[1.4rem] border border-dashed border-zinc-300 bg-white px-4 py-3">
            {currentPage > 0 ? (
              <Link
                href={buildNotificationsHref(activeTab, currentPage - 1)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700"
              >
                Anterior
              </Link>
            ) : null}
            <span className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white">
              Pagina {currentPage + 1}
            </span>
            {hasMore ? (
              <Link
                href={buildNotificationsHref(activeTab, currentPage + 1)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700"
              >
                Proxima
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </ClientAppFrame>
  );
}
