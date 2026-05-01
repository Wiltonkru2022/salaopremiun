import { redirect } from "next/navigation";
import {
  BellRing,
  MessageSquareMore,
  RadioTower,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { createClient } from "@/lib/supabase/server";

const itens = [
  {
    icon: <MessageSquareMore size={18} />,
    title: "Disparo com histórico real",
    description:
      "Estamos finalizando a trilha completa de envio, retorno e leitura para liberar o módulo com segurança.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Liberação com validação técnica",
    description:
      "A ativação pública só entra quando webhook, provedor e rastreabilidade estiverem 100% consistentes.",
  },
  {
    icon: <RadioTower size={18} />,
    title: "Infra pronta para escalar",
    description:
      "A base do módulo já está em produção e a liberação visual será feita no momento certo.",
  },
];

export default async function MarketingPage() {
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
    redirect("/dashboard");
  }

  const access = await getPlanoAccessSnapshot(usuario.id_salao);

  if (!access.recursos.marketing) {
    redirect("/meu-plano?motivo=recurso_marketing_bloqueado");
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[36px] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(199,162,92,0.18),_transparent_32%),linear-gradient(135deg,_#111827_0%,_#18181b_55%,_#0f172a_100%)] px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
        <div className="absolute -right-20 top-10 h-52 w-52 rounded-full bg-[rgba(199,162,92,0.14)] blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />

        <div className="relative max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">
            <Sparkles size={14} />
            Nova funcionalidade em produção
          </div>

          <h1 className="mt-5 max-w-3xl font-display text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
            Central de marketing em fase final de liberação
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            Este módulo está sendo preparado para entrar com disparo profissional,
            histórico validado e operação segura. A liberação será feita assim que
            a camada final de produção for concluída.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Badge icon={<BellRing size={14} />} label="Em implantação técnica" />
            <Badge icon={<TimerReset size={14} />} label="Aguarde a liberação" />
            <Badge icon={<ShieldCheck size={14} />} label="Go-live controlado" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Status do módulo
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
            Marketing temporariamente reservado para a virada oficial
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
            Para evitar uso parcial antes da liberação completa, esta área foi
            colocada em modo de espera. Quando a versão final estiver pronta, o
            painel vai receber a funcionalidade completa com envio, controle e
            acompanhamento operacional.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {itens.map((item) => (
              <article
                key={item.title}
                className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(199,162,92,0.16)] text-[var(--app-accent-strong)]">
                  {item.icon}
                </div>
                <div className="mt-4 text-sm font-bold text-zinc-950">
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-[32px] border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Aviso operacional
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
            Nova funcionalidade em produção. Aguarde.
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Esta tela está reservada para a liberação do novo módulo de
            marketing. Assim que a ativação for concluída, os recursos serão
            exibidos aqui automaticamente.
          </p>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Mensagem do sistema
            </div>
            <div className="mt-3 text-lg font-semibold leading-8 text-white">
              “Estamos preparando a liberação final desta funcionalidade para
              garantir estabilidade, rastreabilidade e uma entrada premium no
              painel.”
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Badge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/80">
      {icon}
      {label}
    </div>
  );
}
