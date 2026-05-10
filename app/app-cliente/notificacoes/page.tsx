import Link from "next/link";
import { ArrowLeft, Bell, CalendarDays, CheckCircle2 } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
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

export default async function ClienteNotificationsPage() {
  const session = await requireClienteAppContext();
  const notifications = await listClienteAppNotifications({
    idConta: session.idConta,
  });

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

        <h1 className="text-3xl font-black tracking-[-0.04em] text-zinc-950">
          Central de notificacoes
        </h1>
        <p className="mt-2 text-base leading-7 text-zinc-500">
          Confirmacoes, lembretes, cancelamentos e pedidos de avaliacao ficam reunidos aqui.
        </p>

        {notifications.length ? (
          <div className="mt-7 space-y-3">
            {notifications.map((notification) => {
              const Icon = notificationIcon(notification.tipo);
              const content = (
                <article className="flex gap-3 rounded-[1.4rem] border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-950">
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-black text-zinc-950">
                        {notification.titulo}
                      </h2>
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-500">
                        {notification.status || "pendente"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      {notification.mensagem}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-zinc-400">
                      {formatDate(notification.createdAt || notification.enviarEm)}
                    </p>
                  </div>
                </article>
              );

              return notification.url ? (
                <Link key={notification.id} href={notification.url}>
                  {content}
                </Link>
              ) : (
                <div key={notification.id}>{content}</div>
              );
            })}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-zinc-200 bg-zinc-50 text-zinc-300">
              <Bell size={54} />
            </div>
            <h2 className="text-2xl font-black text-zinc-800">
              Nada por enquanto
            </h2>
            <p className="mt-3 max-w-md text-base leading-7 text-zinc-500">
              Quando o salao confirmar, reagendar ou finalizar um atendimento, voce recebe o aviso aqui.
            </p>
          </div>
        )}
      </section>
    </ClientAppFrame>
  );
}
