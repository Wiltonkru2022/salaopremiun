import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateClienteAppSession } from "@/lib/client-context.server";
import {
  loadCouponByToken,
  loadCouponRedemptionForAccount,
  redeemClienteCoupon,
} from "@/lib/client-app/coupons";

export const metadata = {
  title: "Resgatar cupom",
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
  const resgateAtual =
    cupom?.id && validation.context?.idConta
      ? await loadCouponRedemptionForAccount({
          idCupom: String(cupom.id),
          idConta: validation.context.idConta,
        })
      : null;
  const salaoSlug = String(salao?.app_cliente_slug || salao?.id || "").trim();
  const codigoCupom = String(cupom?.codigo || "").trim();
  const agendarHref = resgateAtual?.jaUsou
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
    <main className="min-h-dvh bg-[#f7f7f4] px-4 py-8 text-zinc-950">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-900">
            SalaoPremium Cliente
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">
            Resgatar cupom
          </h1>

          {!cupom ? (
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Este cupom nao foi encontrado ou nao esta mais ativo.
            </p>
          ) : (
            <>
              <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                  {String(salao?.nome_fantasia || salao?.nome || "Salao")}
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {String(cupom.nome || "Cupom especial")}
                </h2>
                {cupom.descricao ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {String(cupom.descricao)}
                  </p>
                ) : null}
                {cupom.valido_ate ? (
                  <p className="mt-3 text-xs font-bold text-zinc-500">
                    Valido ate {String(cupom.valido_ate).slice(0, 10).split("-").reverse().join("/")}
                  </p>
                ) : null}
              </div>

              {query.erro ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {query.erro}
                </p>
              ) : null}

              {query.status === "ok" ? (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                  Cupom resgatado. Ele ja aparece no app cliente para agendar neste salao.
                </p>
              ) : null}

              {validation.context && resgateAtual ? (
                <div className="mt-5 grid gap-3">
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                    {resgateAtual.jaUsou
                      ? "Cupom ja resgatado por voce. Esse beneficio ja foi usado, mas voce pode agendar normalmente neste salao."
                      : "Cupom ja resgatado por voce."}
                  </p>
                  <Link
                    href={agendarHref}
                    className="flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white shadow-[0_14px_24px_rgba(15,23,42,0.18)] transition hover:bg-zinc-800"
                  >
                    Agendar agora
                  </Link>
                </div>
              ) : validation.context ? (
                <form action={resgatarAction} className="mt-5">
                  <button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white shadow-[0_14px_24px_rgba(15,23,42,0.18)] transition hover:bg-zinc-800"
                  >
                    Resgatar e agendar
                  </button>
                </form>
              ) : (
                <div className="mt-5 grid gap-3">
                  <Link
                    href={`/app-cliente/login?next=${encodeURIComponent(nextPath)}`}
                    className="flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white"
                  >
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
