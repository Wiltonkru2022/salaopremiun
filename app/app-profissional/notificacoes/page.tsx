import Link from "next/link";
import { BellRing, CheckCircle2, ChevronLeft, KeyRound } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { listProfissionalAppNotifications } from "@/lib/profissional-app-notifications";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

export default async function ProfissionalNotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ notificacao?: string | string[] }>;
}) {
  const context = await requireProfissionalAppContext();
  const params = await searchParams;
  const selectedId = Array.isArray(params.notificacao)
    ? params.notificacao[0]
    : params.notificacao;
  const notifications = await listProfissionalAppNotifications(context).catch(
    () => []
  );
  const selected = notifications.find((item) => item.id === selectedId) || null;

  return (
    <ProfissionalShell title="Notificações" subtitle="Avisos do seu acesso">
      <div className="space-y-3.5">
        <Link
          href="/app-profissional/perfil"
          className="inline-flex items-center gap-2 text-sm font-black text-zinc-600"
        >
          <ChevronLeft size={18} />
          Voltar ao perfil
        </Link>

        {selected ? (
          <section className="rounded-[1.6rem] bg-zinc-950 p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white/10 text-amber-200">
                <KeyRound size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                  Aviso importante
                </div>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em]">
                  {selected.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-200">
                  {selected.description}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                  <CheckCircle2 size={14} />
                  Lida nesta central
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <ProfissionalSurface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                Central
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-zinc-950">
                Seus avisos
              </h1>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-zinc-950 text-white">
              <BellRing size={20} />
            </div>
          </div>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Aqui ficam avisos de segurança, acesso e eventos importantes do App
            Profissional.
          </p>
        </ProfissionalSurface>

        {notifications.length ? (
          <div className="space-y-2.5">
            {notifications.map((item) => {
              const active = item.id === selectedId;

              return (
                <Link
                  key={item.id}
                  href={`/app-profissional/notificacoes?notificacao=${encodeURIComponent(item.id)}`}
                  className={`block rounded-[1.25rem] border p-3.5 shadow-sm transition ${
                    active
                      ? "border-amber-300 bg-amber-50"
                      : "border-zinc-200 bg-white active:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] ${
                        active
                          ? "bg-amber-100 text-amber-700"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      <KeyRound size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-zinc-950">
                        {item.title}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">
                        {item.description}
                      </p>
                      {item.createdAt ? (
                        <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(item.createdAt))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <ProfissionalSurface>
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-zinc-100 text-zinc-500">
                <BellRing size={24} />
              </div>
              <h2 className="mt-4 text-lg font-black text-zinc-950">
                Nenhuma notificação por enquanto
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">
                Quando houver aviso de acesso, segurança ou suporte, ele aparece
                aqui.
              </p>
            </div>
          </ProfissionalSurface>
        )}
      </div>
    </ProfissionalShell>
  );
}
