import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock3, Gift, Scissors, Sparkles } from "lucide-react";
import { validateClienteAppSession } from "@/lib/client-context.server";
import {
  loadCouponRedemptionForAccount,
  redeemClienteCoupon,
} from "@/lib/client-app/coupons";
import {
  getCampaignAvailability,
  loadPublicCampaign,
} from "@/lib/campanhas/public";
import CampaignClickTracker from "@/components/campanhas/CampaignClickTracker";

export const metadata = {
  title: "Campanha",
  manifest: "/app-cliente/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SalãoPremium Cliente",
    statusBarStyle: "default" as const,
  },
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function brDate(value: string | null) {
  return value ? value.split("-").reverse().join("/") : "sem data";
}

export default async function PublicCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const campaign = await loadPublicCampaign(slug);
  const availability = getCampaignAvailability(campaign);
  const session = await validateClienteAppSession().catch(() => ({
    context: null,
    reason: "unauthorized" as const,
  }));

  async function resgatarEAgendarAction() {
    "use server";
    const validation = await validateClienteAppSession();
    if (!validation.context) {
      redirect(`/app-cliente/login?next=${encodeURIComponent(`/campanha/${slug}`)}`);
    }
    const current = await loadPublicCampaign(slug);
    const currentAvailability = getCampaignAvailability(current);
    if (!current || !currentAvailability.ok) {
      redirect(`/campanha/${slug}?erro=indisponivel`);
    }
    const result = await redeemClienteCoupon({
      token: current.resgateToken,
      idConta: validation.context.idConta,
    });
    if (!result.ok) {
      const normalizedError = result.error
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (normalizedError.includes("ja usou")) {
        redirect(`/campanha/${slug}?erro=cupom_usado`);
      }
      redirect(`/campanha/${slug}?erro=${encodeURIComponent(result.error)}`);
    }
    redirect(
      `/app-cliente/salao/${current.salao?.app_cliente_slug || current.idSalao}/reserva?campanha=${encodeURIComponent(
        current.slug
      )}&cupom=${encodeURIComponent(current.codigo)}`
    );
  }

  const salao = campaign?.salao;
  const salaoReservaHref = campaign
    ? `/app-cliente/salao/${campaign.salao?.app_cliente_slug || campaign.idSalao}/reserva`
    : "/app-cliente";
  const resgateAtual =
    campaign?.id && session.context?.idConta
      ? await loadCouponRedemptionForAccount({
          idCupom: campaign.id,
          idConta: session.context.idConta,
        })
      : null;
  const erroNormalizado = String(query.erro || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const cupomJaUsado =
    resgateAtual?.jaUsou ||
    query.erro === "cupom_usado" ||
    erroNormalizado.includes("ja usou");

  return (
    <main className="min-h-dvh bg-[#f7f3ea] px-4 py-6 text-zinc-950">
      {campaign?.id ? (
        <CampaignClickTracker
          idCampanha={campaign.id}
          idSalao={campaign.idSalao}
          origem="campanha_publica"
          slug={slug}
        />
      ) : null}
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.15)]">
        <div className="relative min-h-[280px] overflow-hidden bg-zinc-950 p-6 text-white md:p-10">
          {salao?.foto_capa_url ? (
            <img
              src={String(salao.foto_capa_url)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-amber-950/70" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
              <Sparkles size={14} />
              Campanha exclusiva
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
              {campaign?.nome || "Campanha indisponível"}
            </h1>
            <p className="mt-4 text-base leading-7 text-zinc-200">
              {campaign?.descricao ||
                "Esta campanha nao esta disponivel no momento."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                <Clock3 size={16} /> Ate {brDate(campaign?.validoAte || null)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                <Gift size={16} /> Somente por link
              </span>
            </div>
          </div>
        </div>

        {!campaign || !availability.ok ? (
          <div className="p-6 md:p-10">
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <h2 className="text-2xl font-black">Esta campanha expirou.</h2>
              <p className="mt-2 text-sm leading-6">
                Ela pode ter sido pausada, encerrada ou ter atingido o limite de usos.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 p-5 md:p-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black">
                <Scissors size={22} /> Serviços da campanha
              </h2>
              <div className="mt-4 grid gap-3">
                {campaign.services.map((servico) => (
                  <div key={servico.id} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <strong className="text-lg text-zinc-950">{servico.nome}</strong>
                        <p className="mt-1 text-sm font-bold text-amber-700">{servico.beneficioLabel}</p>
                      </div>
                      <div className="text-right">
                        {servico.preco !== null ? (
                          <p className="text-xs font-bold text-zinc-400 line-through">{money(servico.preco)}</p>
                        ) : null}
                        {servico.precoCampanha !== null ? (
                          <p className="text-xl font-black text-zinc-950">{money(servico.precoCampanha)}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {!campaign.services.length ? (
                  <p className="rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500">
                    Nenhum serviço vinculado a esta campanha.
                  </p>
                ) : null}
              </div>
            </div>

            <aside className="rounded-[1.75rem] border border-zinc-200 bg-zinc-950 p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-100">
                {String(salao?.nome_fantasia || salao?.nome || "SalãoPremium")}
              </p>
              <h2 className="mt-3 text-3xl font-black">Agende pelo link</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                O benefício será validado antes de confirmar o horário.
              </p>
              {query.erro && !cupomJaUsado ? (
                <p className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                  {query.erro}
                </p>
              ) : null}
              {cupomJaUsado ? (
                <div className="mt-5 rounded-[1.25rem] border border-amber-300 bg-amber-50 p-4 text-amber-950">
                  <h3 className="text-lg font-black">Cupom já resgatado</h3>
                  <p className="mt-1 text-sm leading-6">
                    Esse benefício já foi usado por você, mas o agendamento normal continua liberado.
                  </p>
                  <Link
                    href={salaoReservaHref}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white"
                  >
                    <CalendarDays size={18} /> Agendar sem cupom
                  </Link>
                </div>
              ) : session.context ? (
                <form action={resgatarEAgendarAction} className="mt-5">
                  <button className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-zinc-950">
                    <CalendarDays size={18} /> Agendar agora
                  </button>
                </form>
              ) : (
                <Link
                  href={`/app-cliente/login?next=${encodeURIComponent(`/campanha/${slug}`)}`}
                  className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-zinc-950"
                >
                  Entrar para agendar
                </Link>
              )}
              <p className="mt-4 text-xs leading-5 text-zinc-400">
                Validade, limite por cliente e disponibilidade sao conferidos automaticamente.
              </p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
