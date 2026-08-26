import Link from "next/link";
import { Check, Crown } from "lucide-react";
import {
  getPlanoSaasCatalogo,
  getPlanosSaasCobraveisOrdenados,
} from "@/lib/plans/catalog-server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  PainelLinkButton,
  PainelPageHeader,
  PainelStatusBadge,
} from "@/components/painel-ui";

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

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || "";
}

export default async function CompararPlanosPage({
  searchParams,
}: {
  searchParams?: Promise<{ erro?: string | string[]; recurso?: string | string[] }>;
}) {
  const query = searchParams ? await searchParams : undefined;
  const erro = firstParam(query?.erro);
  const { user, usuario } = await getPainelUserContext();
  const supabaseAdmin = getDatabaseAdmin();

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

  const [planoAtualInfo, planos] = await Promise.all([
    getPlanoSaasCatalogo(planoAtual),
    getPlanosSaasCobraveisOrdenados(),
  ]);

  return (
    <div className="space-y-5">
      <PainelPageHeader
        eyebrow="Planos"
        title="Escolha o plano certo sem poluicao"
        description="Compare preco, capacidade da equipe e recursos principais para operar melhor."
        actions={
          <>
            <PainelStatusBadge tone="info">
              Plano atual: {planoAtualInfo.nome}
            </PainelStatusBadge>
            <PainelLinkButton href="/meu-plano" variant="secondary">
              Voltar para Meu Plano
            </PainelLinkButton>
          </>
        }
      />

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600 shadow-sm">
        {jaPossuiAssinatura
          ? "Escolha outro plano para abrir a tela de assinatura ja pronta para upgrade ou downgrade."
          : "Escolha um plano para ativar a assinatura do seu salao."}
      </section>

      {erro ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {erro}
        </p>
      ) : null}

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
              className={`relative overflow-hidden rounded-lg border p-5 shadow-sm ${
                destaque
                  ? "border-amber-300 bg-amber-50 text-zinc-950"
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
                    destaque ? "text-amber-700" : "text-zinc-400"
                  }`}
                >
                  {plano.foco}
                </div>
                <h2 className="mt-2 text-2xl font-black">{plano.nome}</h2>
                {atual ? (
                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
                      destaque
                        ? "bg-white text-amber-900"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    Atual
                  </span>
                ) : null}
              </div>

              <p
                className={`mt-4 min-h-[48px] text-sm leading-6 ${
                  destaque ? "text-amber-900" : "text-zinc-500"
                }`}
              >
                {plano.subtitulo}
              </p>

              <div className="mt-5">
                <span className="text-[2.6rem] font-black">
                  {formatCurrency(plano.valorMensal)}
                </span>
                <span
                  className={`ml-2 text-sm font-bold ${
                    destaque ? "text-amber-900" : "text-zinc-500"
                  }`}
                >
                  / mês
                </span>
              </div>

              <div
                className={`mt-5 grid grid-cols-2 gap-2 rounded-[24px] border p-3 ${
                  destaque
                    ? "border-amber-200 bg-white"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <PlanMetric label="Clientes" value={formatShortLimit(plano.limites.clientes)} dark={destaque} />
                <PlanMetric label="Serviços" value={formatShortLimit(plano.limites.servicos)} dark={destaque} />
                <PlanMetric label="Equipe" value={formatShortLimit(plano.limites.profissionais)} dark={destaque} />
                <PlanMetric label="Usuários" value={formatShortLimit(plano.limites.usuarios)} dark={destaque} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {plano.recursosLiberados.slice(0, 5).map((item) => (
                  <span
                    key={item}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-black ${
                      destaque
                        ? "border-amber-200 bg-white text-amber-950"
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
                      ? "border border-amber-300 bg-white text-amber-900"
                      : "border border-zinc-200 bg-zinc-100 text-zinc-700"
                    : destaque
                      ? "bg-zinc-950 text-white"
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
          ? "bg-white text-zinc-950 ring-amber-200"
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
