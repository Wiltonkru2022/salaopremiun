import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, TicketPercent } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { listClienteAppCouponWallet } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

export const metadata = {
  title: "Meus cupons",
};

function formatDate(value: string | null) {
  if (!value) return "Sem validade definida";
  return value.split("-").reverse().join("/");
}

function statusMeta(status: string) {
  if (status === "usado") {
    return {
      label: "Usado",
      className: "border-zinc-200 bg-zinc-100 text-zinc-600",
      icon: CheckCircle2,
    };
  }
  if (status === "expirado") {
    return {
      label: "Expirado",
      className: "border-red-200 bg-red-50 text-red-700",
      icon: Clock3,
    };
  }
  return {
    label: "Disponível",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: TicketPercent,
  };
}

export default async function ClienteCuponsPage() {
  const session = await requireClienteAppContext();
  const cupons = await listClienteAppCouponWallet({ idConta: session.idConta });
  const disponiveis = cupons.filter((cupom) => cupom.status === "disponivel");
  const usados = cupons.filter((cupom) => cupom.status !== "disponivel");

  return (
    <ClientAppFrame title="Meus cupons" subtitle="Benefícios resgatados e disponíveis.">
      <main className="mx-auto max-w-3xl px-4 py-5 md:px-6">
        <section className="overflow-hidden rounded-[2rem] bg-zinc-950 p-5 text-white shadow-[0_20px_52px_rgba(15,23,42,0.22)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
            <TicketPercent size={14} />
            Carteira de cupons
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Meus cupons</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Veja o que está pronto para usar, o que já foi usado e o que expirou.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Disponíveis</p>
              <strong className="mt-1 block text-2xl">{disponiveis.length}</strong>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Usados</p>
              <strong className="mt-1 block text-2xl">{cupons.filter((cupom) => cupom.status === "usado").length}</strong>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Expirados</p>
              <strong className="mt-1 block text-2xl">{cupons.filter((cupom) => cupom.status === "expirado").length}</strong>
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-3">
          {disponiveis.map((cupom) => {
            const meta = statusMeta(cupom.status);
            const Icon = meta.icon;
            return (
              <article key={cupom.id} className="rounded-[1.5rem] border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black ${meta.className}`}>
                      <Icon size={13} /> {meta.label}
                    </span>
                    <h2 className="mt-3 text-xl font-black text-zinc-950">{cupom.nome}</h2>
                    <p className="mt-1 text-sm font-bold text-zinc-500">{cupom.salaoNome}</p>
                  </div>
                  <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                    {cupom.codigo}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  {cupom.descricao || cupom.descontoLabel}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400">Benefício</p>
                    <strong className="mt-1 block text-zinc-950">{cupom.descontoLabel}</strong>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400">Validade</p>
                    <strong className="mt-1 block text-zinc-950">{formatDate(cupom.validoAte)}</strong>
                  </div>
                </div>
                <Link
                  href={`/app-cliente/salao/${encodeURIComponent(cupom.salaoId)}/reserva?cupom=${encodeURIComponent(cupom.codigo)}`}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white"
                >
                  <CalendarDays size={17} /> Agendar com cupom
                </Link>
              </article>
            );
          })}

          {!disponiveis.length ? (
            <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white p-6 text-center shadow-sm">
              <TicketPercent className="mx-auto text-zinc-400" size={34} />
              <h2 className="mt-3 text-xl font-black text-zinc-950">Nenhum cupom disponível agora</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Quando você resgatar uma campanha de um salão, o cupom aparece aqui.
              </p>
            </div>
          ) : null}
        </section>

        {usados.length ? (
          <section className="mt-6">
            <h2 className="text-lg font-black text-zinc-950">Usados e expirados</h2>
            <div className="mt-3 space-y-2">
              {usados.map((cupom) => {
                const meta = statusMeta(cupom.status);
                return (
                  <article key={cupom.id} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-zinc-950">{cupom.nome}</strong>
                        <span className="text-xs font-bold text-zinc-500">
                          {cupom.salaoNome} · {cupom.status === "usado" ? `Usado em ${formatDate(cupom.usadoEm)}` : formatDate(cupom.validoAte)}
                        </span>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </ClientAppFrame>
  );
}
