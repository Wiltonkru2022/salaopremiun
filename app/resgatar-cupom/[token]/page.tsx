import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CalendarDays, CheckCircle2, Clock3, TicketPercent } from "lucide-react";
import { validateClienteAppSession } from "@/lib/client-context.server";
import {
  loadCouponByToken,
  loadCouponRedemptionForAccount,
  redeemClienteCoupon,
} from "@/lib/client-app/coupons";
import { registerCampaignClick } from "@/lib/campanhas/public";

export const metadata = {
  title: "Resgatar cupom",
  manifest: "/app-cliente/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SalãoPremium Cliente",
    statusBarStyle: "default" as const,
  },
};

export default async function ResgatarCupomPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string; erro?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const cupom = await loadCouponByToken(token);
  const validation = await validateClienteAppSession().catch(() => ({
    context: null,
    reason: "unauthorized" as const,
  }));
  const nextPath = `/resgatar-cupom/${encodeURIComponent(token)}`;
  const salao = cupom
    ? Array.isArray(cupom.saloes)
      ? cupom.saloes[0]
      : cupom.saloes
    : null;

  if (cupom?.id && cupom?.id_salao) {
    await registerCampaignClick({
      idCampanha: String(cupom.id),
      idSalao: String(cupom.id_salao),
      metadata: { origem: "resgatar_cupom", token },
    }).catch(() => null);
  }

  const resgateAtual =
    cupom?.id && validation.context?.idConta
      ? await loadCouponRedemptionForAccount({
          idCupom: String(cupom.id),
          idConta: validation.context.idConta,
        })
      : null;
  const salaoSlug = String(salao?.app_cliente_slug || salao?.id || "").trim();
  const codigoCupom = String(cupom?.codigo || "").trim();
  const validadeLabel = cupom?.valido_ate
    ? String(cupom.valido_ate).slice(0, 10).split("-").reverse().join("/")
    : "Sem validade definida";
  const descontoLabel = cupom
    ? String(cupom.tipo_desconto || "percentual") === "valor_fixo"
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
          Number(cupom.valor_desconto || 0)
        )
      : `${Number(cupom.valor_desconto || 0).toLocaleString("pt-BR", {
          maximumFractionDigits: 0,
        })}%`
    : "";
  const erroNormalizado = String(query.erro || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const cupomJaUsado = Boolean(
    resgateAtual?.jaUsou || erroNormalizado.includes("ja usou")
  );
  const agendarHref = cupomJaUsado
    ? `/app-cliente/salao/${encodeURIComponent(salaoSlug)}/reserva`
    : `/app-cliente/salao/${encodeURIComponent(salaoSlug)}/reserva?cupom=${encodeURIComponent(
        codigoCupom
      )}`;

  async function resgatarAction() {
    "use server";

    const session = await validateClienteAppSession();
    if (!session.context) {
      redirect(`/app-cliente/login?next=${encodeURIComponent(nextPath)}`);
    }

    const result = await redeemClienteCoupon({
      token,
      idConta: session.context.idConta,
    });

    if (!result.ok) {
      const normalizedError = result.error
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (normalizedError.includes("ja usou")) {
        redirect(`${nextPath}?erro=${encodeURIComponent("Você já usou este cupom.")}`);
      }
      redirect(`${nextPath}?erro=${encodeURIComponent(result.error)}`);
    }

    revalidatePath("/app-cliente/inicio");
    redirect(
      `/app-cliente/salao/${result.cupom.salaoSlug}/reserva?cupom=${encodeURIComponent(
        result.cupom.codigo
      )}`
    );
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-[#f7f7f4] px-4 py-8 text-zinc-950">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-amber-200/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="relative inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-900">
            <TicketPercent size={14} />
            SalãoPremium Cliente
          </div>
          <h1 className="relative mt-4 text-3xl font-black tracking-tight">
            Resgatar cupom
          </h1>

          {!cupom ? (
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Este cupom não foi encontrado ou não está mais ativo.
            </p>
          ) : (
            <>
              <div className="relative mt-5 overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-zinc-950 p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                  {String(salao?.nome_fantasia || salao?.nome || "Salão")}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {String(cupom.nome || "Cupom especial")}
                </h2>
                {cupom.descricao ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {String(cupom.descricao)}
                  </p>
                ) : null}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400">
                      Benefício
                    </p>
                    <strong className="mt-1 block text-xl">{descontoLabel}</strong>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400">
                      Validade
                    </p>
                    <strong className="mt-1 block text-xl">{validadeLabel}</strong>
                  </div>
                </div>
              </div>

              {query.erro && !cupomJaUsado ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {query.erro}
                </p>
              ) : null}

              {query.status === "ok" ? (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                  Cupom resgatado. Ele já aparece no app cliente para agendar neste salão.
                </p>
              ) : null}

              {validation.context && (resgateAtual || cupomJaUsado) ? (
                <div className="mt-5 grid gap-3">
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                    {cupomJaUsado
                      ? "Cupom já resgatado por você. Esse benefício já foi usado, mas você pode agendar normalmente neste salão."
                      : "Cupom já resgatado por você."}
                  </p>
                  <Link
                    href={agendarHref}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white shadow-[0_14px_24px_rgba(15,23,42,0.18)] transition hover:bg-zinc-800"
                  >
                    <CalendarDays size={17} />
                    {cupomJaUsado ? "Agendar sem cupom" : "Agendar agora"}
                  </Link>
                </div>
              ) : validation.context ? (
                <form action={resgatarAction} className="mt-5">
                  <button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white shadow-[0_14px_24px_rgba(15,23,42,0.18)] transition hover:bg-zinc-800"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 size={17} /> Resgatar e agendar
                    </span>
                  </button>
                </form>
              ) : (
                <div className="mt-5 grid gap-3">
                  <Link
                    href={`/app-cliente/login?next=${encodeURIComponent(nextPath)}`}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white"
                  >
                    <Clock3 size={17} />
                    Entrar para resgatar
                  </Link>
                  <Link
                    href={`/app-cliente/cadastro?next=${encodeURIComponent(nextPath)}`}
                    className="flex h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950"
                  >
                    Criar conta
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
