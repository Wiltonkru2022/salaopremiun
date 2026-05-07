import Link from "next/link";
import {
  getPlanoCatalogo,
  getPlanosCobraveisOrdenados,
  PLANOS_TABELA_FEATURES,
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

  if (planoAtualCodigo === "teste_gratis") {
    return {
      href: getAssinaturaUrl(`/assinatura?plano=${planoDestinoCodigo}`),
      label: `Assinar ${planoDestinoNome}`,
      variant: "primary" as const,
    };
  }

  return {
    href: getAssinaturaUrl(`/assinatura?plano=${planoDestinoCodigo}`),
    label: ordemDestino > ordemAtual ? "Fazer upgrade" : "Fazer downgrade",
    variant: "primary" as const,
  };
}

function statusClass(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("liberado") || normalized.includes("ilimitado")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

export default async function CompararPlanosPage() {
  const { user, usuario } = await getPainelUserContext();
  const supabaseAdmin = getSupabaseAdmin();

  let planoAtual = "teste_gratis";
  let jaPossuiAssinatura = false;
  let jaUsouTrial = false;

  if (user && usuario?.id_salao) {
      const [{ data: assinatura }, { data: salao }] = await Promise.all([
        supabaseAdmin
          .from("assinaturas")
          .select("id, plano, status, trial_inicio_em, trial_fim_em")
          .eq("id_salao", usuario.id_salao)
          .maybeSingle(),
        supabaseAdmin
          .from("saloes")
          .select("plano, status, trial_inicio_em, trial_fim_em")
          .eq("id", usuario.id_salao)
          .maybeSingle(),
      ]);

      planoAtual = String(
        assinatura?.plano || salao?.plano || assinatura?.status || planoAtual
      );
      jaPossuiAssinatura = Boolean(assinatura?.id);
      jaUsouTrial = Boolean(
        jaPossuiAssinatura ||
          salao?.trial_inicio_em ||
          salao?.trial_fim_em ||
          assinatura?.trial_inicio_em ||
          assinatura?.trial_fim_em
      );
  }

  const planoAtualInfo = getPlanoCatalogo(planoAtual);
  const mostrarPlanoTrial =
    planoAtualInfo.codigo === "teste_gratis" || (!jaUsouTrial && !jaPossuiAssinatura);
  const planos = getPlanosCobraveisOrdenados();

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-zinc-950 p-6 text-white sm:p-7">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
              Comparar planos
            </div>
            <h1 className="mt-2 text-[2.1rem] font-black tracking-[-0.04em]">
              Veja os pacotes de assinatura com clareza
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              Compare preço, limites e recursos de cada plano sem ficar
              adivinhando o que libera ou bloqueia no sistema.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/meu-plano"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-zinc-950 transition hover:-translate-y-0.5"
              >
                Voltar para Meu Plano
              </Link>
              <Link
                href={getAssinaturaUrl(`/assinatura?plano=${planoAtualInfo.codigo === "teste_gratis" ? "basico" : planoAtualInfo.codigo}`)}
                className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Abrir assinatura
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 sm:p-7">
            <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.20em] text-zinc-400">
                Plano atual
              </div>
              <div className="mt-2 text-2xl font-black text-zinc-950">
                {planoAtualInfo.nome}
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {jaPossuiAssinatura
                  ? "Você já possui uma assinatura. Ao clicar em um pacote, a tela de assinatura abre com esse plano pronto para upgrade, downgrade ou renovação."
                  : mostrarPlanoTrial
                    ? "Seu salão ainda pode usar o período inicial, mas a comparação abaixo mostra somente os planos pagos vendidos hoje."
                    : "O teste grátis já foi usado neste salão. Agora o fluxo segue apenas pelos planos pagos."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {jaPossuiAssinatura ? (
        <section className="rounded-[24px] border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 shadow-sm">
          <strong>Você já possui uma assinatura em andamento.</strong> Escolha
          o pacote desejado abaixo e nos vamos abrir a tela de assinatura com a
          mudança pronta para você concluir.
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            Tabela oficial
          </div>
          <h2 className="mt-1 text-xl font-black text-zinc-950">
            Planos e liberações
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Marketing e WhatsApp automático não entram nesta venda. Hoje o WhatsApp é manual pela agenda.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[880px] w-full">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-[0.18em] text-zinc-500">
                <th className="px-5 py-3">Funcionalidade / limite</th>
                <th className="px-5 py-3">Básico</th>
                <th className="px-5 py-3">Pro</th>
                <th className="px-5 py-3">Premium</th>
              </tr>
            </thead>
            <tbody>
              {PLANOS_TABELA_FEATURES.map((item, index, rows) => {
                const showGroup = index === 0 || rows[index - 1]?.grupo !== item.grupo;

                return (
                  <tr key={`${item.grupo}-${item.nome}`} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-5 py-4">
                      {showGroup ? (
                        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                          {item.grupo}
                        </div>
                      ) : null}
                      <div className="text-sm font-bold text-zinc-950">{item.nome}</div>
                    </td>
                    {(["basico", "pro", "premium"] as const).map((plano) => (
                      <td key={plano} className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                            item[plano]
                          )}`}
                        >
                          {item[plano]}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
