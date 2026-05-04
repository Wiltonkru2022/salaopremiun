import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getPlanoAccessSnapshot,
  getPlanoRecursoLabel,
  PLANO_RECURSO_GROUPS,
  PLANO_RECURSOS_PADRAO,
} from "@/lib/plans/access";
import {
  getPlanoCatalogo,
  getPlanoDowngradeCatalogo,
  getPlanoUpgradeCatalogo,
} from "@/lib/plans/catalog";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatLimit(used: number, limit: number | null) {
  return `${used}/${limit == null ? "Ilimitado" : limit}`;
}

function usagePercent(used: number, limit: number | null) {
  if (limit == null || limit <= 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

function statusLabel(status: string) {
  const normalized = String(status || "").replace(/_/g, " ");
  return normalized || "sem status";
}

function getPlanoCheckoutHref(planoAtual: string) {
  const planoCatalogo = getPlanoCatalogo(planoAtual);

  if (planoCatalogo.codigo === "teste_gratis") {
    return getAssinaturaUrl("/assinatura?plano=basico");
  }

  return getAssinaturaUrl(`/assinatura?plano=${planoCatalogo.codigo}`);
}

function getMotivoMeta(motivo?: string | null) {
  const normalized = String(motivo || "").toLowerCase();

  if (normalized === "recurso_estoque_bloqueado") {
    return {
      title: "Estoque bloqueado no plano atual",
      message:
        "Os produtos e movimentacoes ja cadastrados nao foram apagados. O modulo so fica pausado ate o salao voltar para um plano que libera estoque.",
    };
  }

  if (normalized === "recurso_marketing_bloqueado") {
    return {
      title: "Marketing bloqueado no plano atual",
      message:
        "As configuracoes do modulo ficam preservadas, mas o uso do marketing volta a liberar apenas quando o plano incluir esse recurso.",
    };
  }

  if (normalized === "recurso_app_profissional_bloqueado") {
    return {
      title: "App profissional bloqueado no plano atual",
      message:
        "Os acessos ja preparados para a equipe continuam cadastrados, mas o login do app fica pausado ate o salao voltar para o Pro ou Premium.",
    };
  }

  return null;
}

function getUsoTone(percent: number) {
  if (percent >= 100) return "text-red-700 bg-red-50 border-red-200";
  if (percent >= 80) return "text-amber-800 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

export default async function MeuPlanoPage({
  searchParams,
}: {
  searchParams?: Promise<{ motivo?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const motivo =
    typeof params?.motivo === "string"
      ? params.motivo
      : Array.isArray(params?.motivo)
        ? params?.motivo[0]
        : undefined;
  const motivoMeta = getMotivoMeta(motivo);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id_salao")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario?.id_salao) {
    redirect(getAssinaturaUrl("/assinatura"));
  }

  const access = await getPlanoAccessSnapshot(usuario.id_salao);
  const planoCatalogo = getPlanoCatalogo(access.planoCodigo);
  const assinaturaHref = getPlanoCheckoutHref(access.planoCodigo);
  const upgradePlano = getPlanoUpgradeCatalogo(access.planoCodigo);
  const downgradePlano = getPlanoDowngradeCatalogo(access.planoCodigo);
  const recursos = PLANO_RECURSOS_PADRAO.filter(
    (codigo) => codigo !== "agendamentos_mensais"
  ).map((codigo) => ({
    codigo,
    label: getPlanoRecursoLabel(codigo),
    group: PLANO_RECURSO_GROUPS[codigo],
    enabled: Boolean(access.recursos[codigo]),
  }));
  const recursosLiberados = recursos.filter((item) => item.enabled);
  const recursosBloqueados = recursos.filter((item) => !item.enabled);
  const groupedResources = recursos.reduce<Record<string, typeof recursos>>(
    (groups, item) => {
      groups[item.group] = groups[item.group] || [];
      groups[item.group].push(item);
      return groups;
    },
    {}
  );

  const metrics = [
    {
      title: "Usuarios",
      used: access.uso.usuarios,
      limit: access.limites.usuarios,
      color: "bg-zinc-950",
    },
    {
      title: "Profissionais",
      used: access.uso.profissionais,
      limit: access.limites.profissionais,
      color: "bg-emerald-600",
    },
    {
      title: "Clientes",
      used: access.uso.clientes,
      limit: access.limites.clientes,
      color: "bg-violet-600",
    },
    {
      title: "Servicos",
      used: access.uso.servicos,
      limit: access.limites.servicos,
      color: "bg-amber-500",
    },
    {
      title: "Agendamentos do mes",
      used: access.uso.agendamentosMensais,
      limit: access.limites.agendamentosMensais,
      color: "bg-sky-600",
    },
  ];

  const acaoPrincipalLabel =
    planoCatalogo.codigo === "teste_gratis"
      ? "Escolher primeiro plano"
      : "Abrir assinatura";
  const possuiAssinatura = access.planoCodigo !== "teste_gratis";

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-zinc-950 p-6 text-white sm:p-7">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">
              Meu plano
            </div>
            <h1 className="mt-2 text-[2.2rem] font-black tracking-[-0.04em]">
              {planoCatalogo.nome}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              {planoCatalogo.descricao}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.20em] text-zinc-400">
                  Foco do plano
                </div>
                <div className="mt-2 text-lg font-black text-white">
                  {planoCatalogo.foco}
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Ideal para {planoCatalogo.idealPara}
                </p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.20em] text-zinc-400">
                  Leitura rapida
                </div>
                <div className="mt-2 text-lg font-black text-white">
                  {recursosLiberados.length} recursos liberados
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {recursosBloqueados.length} recurso(s) ainda ficam travados no
                  plano atual.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/comparar-planos"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-zinc-950 transition hover:-translate-y-0.5"
              >
                Ver pacotes de assinatura
              </Link>
              <Link
                href={assinaturaHref}
                className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                {acaoPrincipalLabel}
              </Link>
              {upgradePlano ? (
                <Link
                  href={getAssinaturaUrl(`/assinatura?plano=${upgradePlano.codigo}`)}
                  className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  Upgrade para {upgradePlano.nome}
                </Link>
              ) : null}
              {downgradePlano ? (
                <Link
                  href={getAssinaturaUrl(`/assinatura?plano=${downgradePlano.codigo}`)}
                  className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  Downgrade para {downgradePlano.nome}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 sm:p-7">
            <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.20em] text-zinc-400">
                Status comercial
              </div>
              <div className="mt-2 text-2xl font-black capitalize text-zinc-950">
                {statusLabel(access.assinaturaStatus)}
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
                <p>
                  Status do salao:{" "}
                  <span className="font-bold capitalize text-zinc-900">
                    {statusLabel(access.salaoStatus)}
                  </span>
                </p>
                <p>
                  {possuiAssinatura
                    ? "Voce ja possui uma assinatura. Quando quiser trocar de pacote, entre em assinatura ou use os atalhos de upgrade e downgrade acima."
                    : "Seu salao ainda esta na fase inicial. Compare os pacotes e escolha o primeiro plano pago quando quiser seguir."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {access.bloqueioTotal ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 shadow-sm">
          <strong>Assinatura bloqueada.</strong>{" "}
          {access.bloqueioMotivo || "Regularize para continuar operando."}
        </div>
      ) : access.modoRestrito ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 shadow-sm">
          <strong>Modo restrito ativo.</strong> Voce ainda pode consultar dados,
          pagar a assinatura e falar com suporte, mas novas operacoes criticas
          ficam bloqueadas ate a regularizacao.
        </div>
      ) : null}

      {possuiAssinatura ? (
        <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 shadow-sm">
          <strong>Voce ja possui uma assinatura.</strong> Para fazer upgrade ou
          downgrade, escolha o pacote desejado em <Link href="/comparar-planos" className="font-black underline">Comparar planos</Link> ou abra direto a{" "}
          <Link href={assinaturaHref} className="font-black underline">
            tela de assinatura
          </Link>.
        </div>
      ) : null}

      {motivoMeta ? (
        <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 shadow-sm">
          <strong>{motivoMeta.title}.</strong> {motivoMeta.message}
        </div>
      ) : null}

      <section className="grid gap-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const percent = usagePercent(metric.used, metric.limit);
          const tone = getUsoTone(percent);

          return (
            <div
              key={metric.title}
              className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm"
            >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="max-w-[112px] text-[10px] font-black uppercase leading-tight tracking-[0.14em] text-zinc-400 sm:max-w-none">
                      {metric.title}
                    </div>
                  <div className="mt-2 text-xl font-black text-zinc-950">
                    {formatLimit(metric.used, metric.limit)}
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${tone}`}>
                  {percent}%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${metric.color}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.20em] text-zinc-400">
                Matriz do plano
              </div>
              <h2 className="mt-2 text-xl font-black text-zinc-950">
                O que esta liberado e o que ainda falta destravar
              </h2>
            </div>
            <Link
              href="/comparar-planos"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-900 transition hover:border-zinc-950"
            >
              Comparar planos
            </Link>
          </div>

          <div className="mt-5 space-y-5">
            {Object.entries(groupedResources).map(([group, items]) => (
              <div key={group}>
                <h3 className="text-xs font-black uppercase tracking-[0.20em] text-zinc-400">
                  {group}
                </h3>
                <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                  {items.map((item) => (
                    <div
                      key={item.codigo}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                        item.enabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                    >
                      <div className="text-[11px] font-black uppercase tracking-[0.18em]">
                        {item.enabled ? "Liberado" : "Bloqueado"}
                      </div>
                      <div className="mt-1.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[26px] border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.20em] text-emerald-200">
              Proxima decisao
            </div>
            <h3 className="mt-2 text-xl font-black">
              O plano precisa acompanhar o tamanho da operacao.
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Quando voce bater limite de agenda, equipe ou recursos premium, o
              upgrade libera o proximo nivel sem apagar nada do salao.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/comparar-planos"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-zinc-950 transition hover:-translate-y-0.5"
              >
                Ver pacotes
              </Link>
              <Link
                href={assinaturaHref}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Abrir assinatura
              </Link>
            </div>
          </div>

          <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.20em] text-amber-600">
              Pontos ainda bloqueados
            </div>
            <div className="mt-3 space-y-2.5 text-sm font-bold">
              {recursosBloqueados.slice(0, 6).map((item) => (
                <div key={item.codigo} className="rounded-2xl bg-white/75 p-2.5">
                  {item.label}
                </div>
              ))}
              {recursosBloqueados.length === 0 ? (
                <div className="rounded-2xl bg-white/75 p-2.5">
                  Tudo liberado no plano atual.
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
