import Link from "next/link";
import { getPlanoCatalogo, getPlanosOrdenados } from "@/lib/plans/catalog";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  if (!value) return "R$ 0,00";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatLimit(value: number | null, suffix: string) {
  if (value == null || value >= 999) return `Ilimitado${suffix}`;
  return `${value.toLocaleString("pt-BR")}${suffix}`;
}

function getPlanoAction(params: {
  planoAtualCodigo: string;
  planoDestinoCodigo: string;
  planoDestinoNome: string;
  ordemAtual: number;
  ordemDestino: number;
}) {
  const {
    planoAtualCodigo,
    planoDestinoCodigo,
    planoDestinoNome,
    ordemAtual,
    ordemDestino,
  } = params;

  if (planoDestinoCodigo === planoAtualCodigo) {
    return {
      href: "/meu-plano",
      label: "Plano atual",
      variant: "current" as const,
    };
  }

  if (planoDestinoCodigo === "teste_gratis") {
    return {
      href: "/meu-plano",
      label: "Período inicial",
      variant: "muted" as const,
    };
  }

  if (planoAtualCodigo === "teste_gratis") {
    return {
      href: `/assinatura?plano=${planoDestinoCodigo}`,
      label: `Assinar ${planoDestinoNome}`,
      variant: "primary" as const,
    };
  }

  return {
    href: `/assinatura?plano=${planoDestinoCodigo}`,
    label: ordemDestino > ordemAtual ? "Fazer upgrade" : "Fazer downgrade",
    variant: "primary" as const,
  };
}

export default async function CompararPlanosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let planoAtual = "teste_gratis";

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id_salao")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuario?.id_salao) {
      const { data: assinatura } = await supabase
        .from("assinaturas")
        .select("plano")
        .eq("id_salao", usuario.id_salao)
        .maybeSingle();

      planoAtual = String(assinatura?.plano || planoAtual);
    }
  }

  const planoAtualInfo = getPlanoCatalogo(planoAtual);
  const planos = getPlanosOrdenados();

  return (
    <div className="space-y-4">
      <section className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
          Comparar planos
        </div>
        <h1 className="mt-2 text-[2rem] font-black tracking-[-0.04em] text-zinc-950">
          O que cada plano libera de verdade
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
          Aqui a comparação fica clara: preço, público ideal, limites e o que
          libera ou bloqueia no sistema. O plano atual do salão é{" "}
          <span className="font-bold text-zinc-900">{planoAtualInfo.nome}</span>.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {planos.map((plano) => {
          const atual = plano.codigo === planoAtualInfo.codigo;
          const action = getPlanoAction({
            planoAtualCodigo: planoAtualInfo.codigo,
            planoDestinoCodigo: plano.codigo,
            planoDestinoNome: plano.nome,
            ordemAtual: planoAtualInfo.ordem,
            ordemDestino: plano.ordem,
          });

          const buttonClass =
            action.variant === "primary"
              ? plano.destaque
                ? "bg-white text-zinc-950 hover:-translate-y-0.5"
                : "bg-zinc-950 text-white hover:-translate-y-0.5"
              : plano.destaque
                ? "border border-white/15 bg-white/10 text-white"
                : "border border-zinc-200 bg-zinc-100 text-zinc-700";

          return (
            <article
              key={plano.codigo}
              className={`rounded-[24px] border p-4 shadow-sm ${
                plano.destaque
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-950"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className={`text-xs font-black uppercase tracking-[0.22em] ${
                      plano.destaque ? "text-emerald-200" : "text-zinc-400"
                    }`}
                  >
                    {plano.foco}
                  </div>
                  <h2 className="mt-1.5 text-xl font-black">{plano.nome}</h2>
                </div>

                {atual ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                    Atual
                  </span>
                ) : null}
              </div>

              <p
                className={`mt-3 text-sm leading-6 ${
                  plano.destaque ? "text-zinc-200" : "text-zinc-500"
                }`}
              >
                {plano.subtitulo}
              </p>

              <div className="mt-4 text-2xl font-black">
                {plano.valorMensal === 0
                  ? "Grátis"
                  : formatCurrency(plano.valorMensal)}
                {plano.valorMensal > 0 ? (
                  <span
                    className={`ml-2 text-sm font-semibold ${
                      plano.destaque ? "text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    / mês
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-2.5 text-sm">
                <div
                  className={`rounded-2xl border px-4 py-2.5 ${
                    plano.destaque
                      ? "border-white/10 bg-white/5"
                      : "border-zinc-200 bg-zinc-50"
                  }`}
                >
                  <div
                    className={`text-[11px] font-black uppercase tracking-[0.18em] ${
                      plano.destaque ? "text-zinc-300" : "text-zinc-400"
                    }`}
                  >
                    Limites
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div>
                      {formatLimit(
                        plano.limites.agendamentosMensais,
                        " agendamentos/mês"
                      )}
                    </div>
                    <div>{formatLimit(plano.limites.clientes, " clientes")}</div>
                    <div>{formatLimit(plano.limites.servicos, " serviços")}</div>
                    <div>
                      {formatLimit(plano.limites.profissionais, " profissionais")}
                    </div>
                    <div>{formatLimit(plano.limites.usuarios, " usuários")}</div>
                  </div>
                </div>

                <div>
                  <div
                    className={`text-[11px] font-black uppercase tracking-[0.18em] ${
                      plano.destaque ? "text-zinc-300" : "text-zinc-400"
                    }`}
                  >
                    Libera
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {plano.recursosLiberados.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div
                    className={`text-[11px] font-black uppercase tracking-[0.18em] ${
                      plano.destaque ? "text-zinc-300" : "text-zinc-400"
                    }`}
                  >
                    Continua bloqueado
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {plano.recursosBloqueados.length > 0 ? (
                      plano.recursosBloqueados.map((item) => (
                        <li key={item}>• {item}</li>
                      ))
                    ) : (
                      <li>• Nada bloqueado neste plano</li>
                    )}
                  </ul>
                </div>
              </div>

              <Link
                href={action.href}
                className={`mt-5 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-black transition ${buttonClass}`}
              >
                {action.label}
              </Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}


