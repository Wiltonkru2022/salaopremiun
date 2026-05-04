import Link from "next/link";
import { getPlanoCatalogo, getPlanosOrdenados } from "@/lib/plans/catalog";
import { getAssinaturaUrl } from "@/lib/site-urls";
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

export default async function CompararPlanosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let planoAtual = "teste_gratis";
  let jaPossuiAssinatura = false;
  let jaUsouTrial = false;

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id_salao")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuario?.id_salao) {
      const [{ data: assinatura }, { data: salao }] = await Promise.all([
        supabase
          .from("assinaturas")
          .select("id, plano, status, trial_inicio_em, trial_fim_em")
          .eq("id_salao", usuario.id_salao)
          .maybeSingle(),
        supabase
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
  }

  const planoAtualInfo = getPlanoCatalogo(planoAtual);
  const mostrarPlanoTrial =
    planoAtualInfo.codigo === "teste_gratis" || (!jaUsouTrial && !jaPossuiAssinatura);
  const planos = getPlanosOrdenados().filter(
    (plano) => plano.codigo !== "teste_gratis" || mostrarPlanoTrial
  );

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
              Compare preco, limites e recursos de cada plano sem ficar
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
                  ? "Voce ja possui uma assinatura. Ao clicar em um pacote, a tela de assinatura abre com esse plano pronto para upgrade, downgrade ou renovacao."
                  : mostrarPlanoTrial
                    ? "Seu salao ainda pode usar o periodo inicial antes da primeira contratacao."
                    : "O teste gratis ja foi usado neste salao. Agora o fluxo segue apenas pelos planos pagos."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {jaPossuiAssinatura ? (
        <section className="rounded-[24px] border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 shadow-sm">
          <strong>Voce ja possui uma assinatura em andamento.</strong> Escolha
          o pacote desejado abaixo e nos vamos abrir a tela de assinatura com a
          mudanca pronta para voce concluir.
        </section>
      ) : null}

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
                  ? "Gratis"
                  : formatCurrency(plano.valorMensal)}
                {plano.valorMensal > 0 ? (
                  <span
                    className={`ml-2 text-sm font-semibold ${
                      plano.destaque ? "text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    / mes
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
                        " agendamentos/mes"
                      )}
                    </div>
                    <div>{formatLimit(plano.limites.clientes, " clientes")}</div>
                    <div>{formatLimit(plano.limites.servicos, " servicos")}</div>
                    <div>
                      {formatLimit(plano.limites.profissionais, " profissionais")}
                    </div>
                    <div>{formatLimit(plano.limites.usuarios, " usuarios")}</div>
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
