import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import {
  getPlanoCatalogo,
  getPlanosCobraveisOrdenados,
} from "@/lib/plans/catalog";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  if (!value) return "R$ 0,00";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatShortLimit(value: number | null) {
  if (value == null || value >= 999) return "Ilimitado";
  return value.toLocaleString("pt-BR");
}

function getPlanoAction(params: {
  planoAtualCodigo: string;
  planoDestinoCodigo: string;
  planoDestinoNome: string;
  ordemAtual: number;
  ordemDestino: number;
}) {
  if (params.planoDestinoCodigo === params.planoAtualCodigo) {
    return {
      href: "/meu-plano",
      label: "Plano atual",
      variant: "current" as const,
    };
  }

  if (params.planoAtualCodigo === "teste_gratis") {
    return {
      href: getAssinaturaUrl(`/assinatura?plano=${params.planoDestinoCodigo}`),
      label: `Assinar ${params.planoDestinoNome}`,
      variant: "primary" as const,
    };
  }

  return {
    href: getAssinaturaUrl(`/assinatura?plano=${params.planoDestinoCodigo}`),
    label:
      params.ordemDestino > params.ordemAtual
        ? "Fazer upgrade"
        : "Fazer downgrade",
    variant: "primary" as const,
  };
}

export default async function CompararPlanosPage() {
  const { user, usuario } = await getPainelUserContext();
  const supabaseAdmin = getSupabaseAdmin();

  let planoAtual = "teste_gratis";
  let jaPossuiAssinatura = false;

  if (user && usuario?.id_salao) {
    const [{ data: assinatura }, { data: salao }] = await Promise.all([
      supabaseAdmin
        .from("assinaturas")
        .select("id, plano, status")
        .eq("id_salao", usuario.id_salao)
        .maybeSingle(),
      supabaseAdmin
        .from("saloes")
        .select("plano, status")
        .eq("id", usuario.id_salao)
        .maybeSingle(),
    ]);

    planoAtual = String(
      assinatura?.plano || salao?.plano || assinatura?.status || planoAtual
    );
    jaPossuiAssinatura = Boolean(assinatura?.id);
  }

  const planoAtualInfo = getPlanoCatalogo(planoAtual);
  const planos = getPlanosCobraveisOrdenados();

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-zinc-950 p-6 text-white sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.20em] text-[var(--app-accent)]">
              <Sparkles size={14} />
              Planos SalaoPremium
            </div>
            <h1 className="mt-4 max-w-3xl font-display text-[2.45rem] font-black leading-tight tracking-[-0.05em]">
              Escolha o plano certo sem poluicao.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Agora a comparacao mostra somente o que importa: preco, capacidade
              da equipe e recursos principais para operar melhor.
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 via-white to-zinc-50 p-6 sm:p-8">
            <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.20em] text-zinc-400">
                Plano atual
              </div>
              <div className="mt-2 text-2xl font-black text-zinc-950">
                {planoAtualInfo.nome}
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {jaPossuiAssinatura
                  ? "Escolha outro plano para abrir a tela de assinatura ja pronta para upgrade ou downgrade."
                  : "Escolha um plano para ativar a assinatura do seu salao."}
              </p>
              <Link
                href="/meu-plano"
                className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white"
              >
                Voltar para Meu Plano
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {planos.map((plano) => {
          const atual = plano.codigo === planoAtualInfo.codigo;
          const action = getPlanoAction({
            planoAtualCodigo: planoAtualInfo.codigo,
            planoDestinoCodigo: plano.codigo,
            planoDestinoNome: plano.nome,
            ordemAtual: planoAtualInfo.ordem,
            ordemDestino: plano.ordem,
          });
          const destaque = plano.codigo === "pro";

          return (
            <article
              key={plano.codigo}
              className={`relative overflow-hidden rounded-[30px] border p-5 shadow-sm ${
                destaque
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-950"
              }`}
            >
              {destaque ? (
                <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--app-accent)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-950">
                  <Crown size={13} />
                  Mais popular
                </div>
              ) : null}

              <div className="max-w-[78%]">
                <div
                  className={`text-xs font-black uppercase tracking-[0.2em] ${
                    destaque ? "text-[var(--app-accent)]" : "text-zinc-400"
                  }`}
                >
                  {plano.foco}
                </div>
                <h2 className="mt-2 text-2xl font-black">{plano.nome}</h2>
                {atual ? (
                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
                      destaque
                        ? "bg-white/10 text-white"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    Atual
                  </span>
                ) : null}
              </div>

              <p
                className={`mt-4 min-h-[48px] text-sm leading-6 ${
                  destaque ? "text-zinc-300" : "text-zinc-500"
                }`}
              >
                {plano.subtitulo}
              </p>

              <div className="mt-5">
                <span className="text-[2.6rem] font-black tracking-[-0.06em]">
                  {formatCurrency(plano.valorMensal)}
                </span>
                <span
                  className={`ml-2 text-sm font-bold ${
                    destaque ? "text-zinc-300" : "text-zinc-500"
                  }`}
                >
                  / mes
                </span>
              </div>

              <div
                className={`mt-5 grid grid-cols-2 gap-2 rounded-[24px] border p-3 ${
                  destaque
                    ? "border-white/10 bg-white/5"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <PlanMetric label="Clientes" value={formatShortLimit(plano.limites.clientes)} dark={destaque} />
                <PlanMetric label="Servicos" value={formatShortLimit(plano.limites.servicos)} dark={destaque} />
                <PlanMetric label="Equipe" value={formatShortLimit(plano.limites.profissionais)} dark={destaque} />
                <PlanMetric label="Usuarios" value={formatShortLimit(plano.limites.usuarios)} dark={destaque} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {plano.recursosLiberados.slice(0, 5).map((item) => (
                  <span
                    key={item}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-black ${
                      destaque
                        ? "border-white/10 bg-white/10 text-white"
                        : "border-zinc-200 bg-zinc-50 text-zinc-800"
                    }`}
                  >
                    <Check size={13} />
                    {item}
                  </span>
                ))}
              </div>

              <Link
                href={action.href}
                className={`mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-black transition hover:-translate-y-0.5 ${
                  action.variant === "current"
                    ? destaque
                      ? "border border-white/15 bg-white/10 text-white"
                      : "border border-zinc-200 bg-zinc-100 text-zinc-700"
                    : destaque
                      ? "bg-[var(--app-accent)] text-zinc-950"
                      : "bg-zinc-950 text-white"
                }`}
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

function PlanMetric({
  label,
  value,
  dark,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-[18px] px-3 py-3 shadow-sm ring-1 ${
        dark
          ? "bg-white/10 text-white ring-white/10"
          : "bg-white text-zinc-950 ring-black/[0.03]"
      }`}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">
        {label}
      </div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}
