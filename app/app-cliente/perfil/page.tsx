import Link from "next/link";
import { Mail, Phone, UserPen } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientProfileShortcuts from "@/components/client-app/ClientProfileShortcuts";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getClienteAppProfileData } from "@/lib/client-app/queries";

export default async function ClientePerfilPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const session = await requireClienteAppContext();
  const profile = await getClienteAppProfileData({
    idConta: session.idConta,
  });
  const params = searchParams ? await searchParams : undefined;

  return (
    <ClientAppFrame
      title="Perfil"
      subtitle="Seus dados e preferencias."
    >
      <section className="space-y-4">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/70 bg-zinc-950 text-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.35),transparent_38%),linear-gradient(135deg,#18181b,#27272a)] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-white text-2xl font-black text-zinc-950">
                {(profile.nome || session.nome || "C").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                  Conta cliente
                </div>
                <h2 className="mt-1 truncate text-2xl font-black">
                  {profile.nome || session.nome}
                </h2>
                <div className="mt-1 truncate text-sm text-white/70">
                  {profile.email || session.email}
                </div>
              </div>
            </div>
          </div>
        </div>

        {params?.status === "salvo" ? (
          <div className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Perfil atualizado com sucesso.
          </div>
        ) : null}

        {params?.status === "erro_excluir" ? (
          <div className="rounded-[1.3rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Nao foi possivel encerrar sua conta agora.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-zinc-950">
                  Seus dados
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Confira seus dados antes de agendar ou avaliar um atendimento.
                </p>
              </div>
              <Link
                href="/app-cliente/perfil/editar"
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white"
              >
                <UserPen size={17} />
                Editar
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Nome
                </div>
                <div className="mt-1 text-base font-black text-zinc-950">
                  {profile.nome || session.nome}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                    <Mail size={15} />
                    E-mail
                  </div>
                  <div className="mt-2 break-words text-sm font-semibold text-zinc-800">
                    {profile.email || session.email}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                    <Phone size={15} />
                    Telefone
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-800">
                    {profile.telefone || "Nao informado"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Preferencias
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {profile.preferenciasGerais ||
                    "Nenhuma preferencia cadastrada ainda."}
                </p>
              </div>
            </div>
          </div>

          <ClientProfileShortcuts />
        </div>
      </section>
    </ClientAppFrame>
  );
}
