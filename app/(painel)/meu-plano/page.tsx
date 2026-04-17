import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getPlanoAccessSnapshot,
  getPlanoRecursoLabel,
  PLANO_RECURSO_GROUPS,
  PLANO_RECURSOS_PADRAO,
} from "@/lib/plans/access";
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

function getPlanoCheckoutHref(planoAtual: string, upgrade = false) {
  const plano = String(planoAtual || "").toLowerCase();

  if (upgrade) {
    if (plano === "premium") return "/assinatura?plano=premium";
    if (plano === "pro") return "/assinatura?plano=premium";
    return "/assinatura?plano=pro";
  }

  if (plano === "basico" || plano === "pro" || plano === "premium") {
    return `/assinatura?plano=${plano}`;
  }

  return "/assinatura?plano=basico";
}

export default async function MeuPlanoPage() {
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
    redirect("/assinatura");
  }

  const access = await getPlanoAccessSnapshot(usuario.id_salao);
  const recursos = PLANO_RECURSOS_PADRAO.map((codigo) => ({
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

  const usuariosPercent = usagePercent(
    access.uso.usuarios,
    access.limites.usuarios
  );
  const profissionaisPercent = usagePercent(
    access.uso.profissionais,
    access.limites.profissionais
  );
  const assinaturaHref = getPlanoCheckoutHref(access.planoCodigo);
  const upgradeHref = getPlanoCheckoutHref(access.planoCodigo, true);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="bg-zinc-950 p-7 text-white sm:p-9">
            <div className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-200">
              Meu plano
            </div>
            <h1 className="mt-3 font-display text-4xl font-black">
              {access.planoNome}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              Controle de uso, recursos liberados e limites comerciais do seu
              salao. Se algo estiver bloqueado, o sistema mostra o motivo e o
              caminho para liberar.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={assinaturaHref}
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:-translate-y-0.5"
              >
                Gerenciar assinatura
              </Link>
              <Link
                href={upgradeHref}
                className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Fazer upgrade
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-7 sm:p-9">
            <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                Status da assinatura
              </div>
              <div className="mt-3 text-2xl font-black capitalize text-zinc-950">
                {statusLabel(access.assinaturaStatus)}
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Status do salao:{" "}
                <span className="font-bold capitalize text-zinc-800">
                  {statusLabel(access.salaoStatus)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {access.bloqueioTotal ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800 shadow-sm">
          <strong>Assinatura bloqueada.</strong>{" "}
          {access.bloqueioMotivo || "Regularize para continuar operando."}
        </div>
      ) : access.modoRestrito ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
          <strong>Modo restrito ativo.</strong> Voce ainda pode consultar dados,
          pagar a assinatura e falar com suporte, mas novas operacoes criticas
          ficam bloqueadas ate a regularizacao.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                Usuarios
              </div>
              <div className="mt-3 text-2xl font-black text-zinc-950">
                {formatLimit(access.uso.usuarios, access.limites.usuarios)}
              </div>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">
              {usuariosPercent}%
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-950"
              style={{ width: `${usuariosPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                Profissionais
              </div>
              <div className="mt-3 text-2xl font-black text-zinc-950">
                {formatLimit(
                  access.uso.profissionais,
                  access.limites.profissionais
                )}
              </div>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">
              {profissionaisPercent}%
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${profissionaisPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Recursos
          </div>
          <div className="mt-3 text-2xl font-black text-zinc-950">
            {recursosLiberados.length}/{recursos.length}
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {recursosBloqueados.length} recurso(s) podem virar upgrade ou pacote
            extra.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                Matriz do plano
              </div>
              <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
                Recursos por categoria
              </h2>
            </div>
            <Link
              href={assinaturaHref}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-900 transition hover:border-zinc-950"
            >
              Ver planos
            </Link>
          </div>

          <div className="mt-6 space-y-6">
            {Object.entries(groupedResources).map(([group, items]) => (
              <div key={group}>
                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
                  {group}
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {items.map((item) => (
                    <div
                      key={item.codigo}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                        item.enabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                    >
                      <span>{item.enabled ? "Liberado" : "Bloqueado"}</span>
                      <span className="mx-2 text-zinc-300">/</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[30px] border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">
              Upgrade inteligente
            </div>
            <h3 className="mt-3 text-2xl font-black">
              Libere mais recursos sem baguncar a operacao.
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Quando um recurso nao estiver no plano, o sistema bloqueia com
              mensagem clara e leva para assinatura, sem quebrar o fluxo.
            </p>
            <Link
              href={upgradeHref}
              className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:-translate-y-0.5"
            >
              Comparar planos
            </Link>
          </div>

          <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600">
              Proximos bloqueios
            </div>
            <div className="mt-4 space-y-3 text-sm font-bold">
              {recursosBloqueados.slice(0, 5).map((item) => (
                <div key={item.codigo} className="rounded-2xl bg-white/70 p-3">
                  {item.label}
                </div>
              ))}
              {recursosBloqueados.length === 0 ? (
                <div className="rounded-2xl bg-white/70 p-3">
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
