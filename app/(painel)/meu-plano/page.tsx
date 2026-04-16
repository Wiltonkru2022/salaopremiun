import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  const recursos = Object.entries(access.recursos).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <div className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">
          Meu plano
        </div>
        <h1 className="mt-3 font-display text-4xl font-black">
          {access.planoNome}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
          Veja recursos liberados, limites usados e bloqueios comerciais do seu
          plano atual.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/assinatura"
            className="rounded-full bg-white px-5 py-3 text-sm font-black text-zinc-950"
          >
            Gerenciar assinatura
          </Link>
          <Link
            href="/assinatura"
            className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white"
          >
            Fazer upgrade
          </Link>
        </div>
      </section>

      {access.bloqueioTotal ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-red-800">
          <strong>Assinatura bloqueada.</strong>{" "}
          {access.bloqueioMotivo || "Regularize para continuar operando."}
        </div>
      ) : access.modoRestrito ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-900">
          Sua assinatura esta em modo restrito. Voce ainda pode consultar dados
          e regularizar a assinatura.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Status
          </div>
          <div className="mt-3 text-2xl font-black text-zinc-950">
            {access.assinaturaStatus || "-"}
          </div>
        </div>
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Usuarios
          </div>
          <div className="mt-3 text-2xl font-black text-zinc-950">
            {access.uso.usuarios}/{access.limites.usuarios ?? "∞"}
          </div>
        </div>
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Profissionais
          </div>
          <div className="mt-3 text-2xl font-black text-zinc-950">
            {access.uso.profissionais}/{access.limites.profissionais ?? "∞"}
          </div>
        </div>
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Recursos
          </div>
          <div className="mt-3 text-2xl font-black text-zinc-950">
            {recursos.filter(([, enabled]) => enabled).length}/{recursos.length}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl font-black">Recursos do plano</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recursos.map(([recurso, enabled]) => (
            <div
              key={recurso}
              className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                enabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500"
              }`}
            >
              {enabled ? "Liberado" : "Bloqueado"} · {recurso}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
