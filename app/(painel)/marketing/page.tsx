import { redirect } from "next/navigation";
import {
  BellRing,
  MessageSquareMore,
  RadioTower,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { PainelPageHeader, PainelStatusBadge } from "@/components/painel-ui";

const itens = [
  {
    icon: <MessageSquareMore size={18} />,
    title: "Disparo com histórico real",
    description:
      "Estamos finalizando a trilha completa de envio, retorno e leitura para liberar o módulo com segurança.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Liberação com válidação técnica",
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
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    redirect("/login");
  }

  if (!usuario?.id_salao) {
    redirect("/dashboard");
  }

  const access = await getPlanoAccessSnapshot(usuario.id_salao);

  if (!access.recursos.marketing) {
    redirect("/meu-plano?motivo=recurso_marketing_bloqueado");
  }

  return (
    <div className="space-y-5">
      <PainelPageHeader
        eyebrow="Marketing"
        title="Central de marketing em fase final de liberacao"
        description="Modulo preparado para disparo profissional, historico validado e operacao segura. A liberacao sera feita assim que a camada final de producao for concluida."
        actions={
          <>
            <PainelStatusBadge tone="warning" className="gap-1.5">
              <BellRing size={14} />
              Em implantacao
            </PainelStatusBadge>
            <PainelStatusBadge tone="default" className="gap-1.5">
              <TimerReset size={14} />
              Aguardando liberacao
            </PainelStatusBadge>
            <PainelStatusBadge tone="success" className="gap-1.5">
              <ShieldCheck size={14} />
              Go-live controlado
            </PainelStatusBadge>
          </>
        }
      />

      <section className="grid gap-4 2xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Status do módulo
          </div>
          <h2 className="mt-2 text-2xl font-black text-zinc-950">
            Marketing temporariamente reservado para a virada oficial
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            Para evitar uso parcial antes da liberação completa, esta área foi
            colocada em modo de espera. Quando a versão final estiver pronta, o
            painel vai receber a funcionalidade completa com envio, controle e
            acompanhamento operacional.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {itens.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(199,162,92,0.16)] text-[var(--app-accent-strong)]">
                  {item.icon}
                </div>
                <div className="mt-3 text-sm font-bold text-zinc-950">
                  {item.title}
                </div>
                <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Aviso operacional
          </div>
          <h2 className="mt-2 text-2xl font-black text-zinc-950">
            Nova funcionalidade em produção. Aguarde.
          </h2>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            Esta tela está reservada para a liberação do novo módulo de marketing.
            Assim que a ativação for concluída, os recursos serão exibidos aqui
            automaticamente.
          </p>

          <div className="mt-5 rounded-lg border border-amber-200 bg-white p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
              Mensagem do sistema
            </div>
            <div className="mt-2.5 text-base font-semibold leading-7 text-zinc-900">
              "Estamos preparando a liberação final desta funcionalidade para
              garantir estabilidade, rastreabilidade e uma entrada premium no
              painel."
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
