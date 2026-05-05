import Link from "next/link";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppSalonCard from "@/components/client-app/ClientAppSalonCard";
import { listVisibleClientAppSaloes } from "@/lib/client-app/queries";

export default async function InicioClientePage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string | string[] }>;
}) {
  const params = await searchParams;
  const busca = Array.isArray(params.busca) ? params.busca[0] : params.busca;
  const saloes = await listVisibleClientAppSaloes({
    search: busca,
    limit: 12,
  });

  return (
    <ClientAppFrame
      title="Encontre seu salao"
      subtitle="Somente saloes com plano premium ativo aparecem aqui."
    >
      <section className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <div className="rounded-[1.8rem] border border-white/70 bg-zinc-950 p-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-100">
            App cliente
          </div>
          <h2 className="mt-3 text-[1.75rem] font-black tracking-[-0.04em]">
            Agende com mais calma
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Veja saloes premium, conheca equipe, descubra servicos e use uma
            conta global para agendar onde quiser.
          </p>

          <form className="mt-5 space-y-3" action="/app-cliente/inicio">
            <input
              name="busca"
              defaultValue={busca || ""}
              placeholder="Buscar por nome, bairro ou cidade"
              className="h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-zinc-300 focus:border-white/30"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-zinc-950"
            >
              Buscar saloes
            </button>
          </form>

          <div className="mt-5 text-sm text-zinc-300">
            Ja tem conta?{" "}
            <Link href="/app-cliente/login" className="font-bold text-white underline">
              Entrar
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {saloes.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {saloes.map((salao) => (
                <ClientAppSalonCard key={salao.id} salao={salao} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.8rem] border border-white/70 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                Nenhum salao encontrado agora
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Tente outro termo de busca ou volte depois. A listagem mostra
                apenas saloes premium com publicacao ativa no app cliente.
              </p>
            </div>
          )}
        </div>
      </section>
    </ClientAppFrame>
  );
}
