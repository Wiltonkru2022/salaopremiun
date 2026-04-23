import Link from "next/link";
import { ChevronLeft, Download, Share, Smartphone } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

type SearchParams = Promise<{
  device?: string;
}>;

function stepsFor(device: string) {
  if (device === "ios") {
    return [
      "Abra esta pagina no Safari do iPhone.",
      "Toque no botao de compartilhar.",
      "Escolha Adicionar a Tela de Inicio.",
      "Confirme em Adicionar.",
    ];
  }

  if (device === "android") {
    return [
      "Abra esta pagina no Chrome do Android.",
      "Toque em Instalar app, se aparecer.",
      "Se nao aparecer, abra o menu de tres pontos.",
      "Escolha Adicionar a tela inicial.",
    ];
  }

  return [
    "Abra o app no navegador principal do aparelho.",
    "Procure por Instalar app ou Adicionar a tela inicial.",
    "Confirme o atalho.",
    "Depois abra pelo icone SalaoPremium.",
  ];
}

export default async function InstalarAppProfissionalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireProfissionalAppContext();

  const { device = "" } = await searchParams;
  const normalizedDevice = String(device || "").toLowerCase();
  const isIos = normalizedDevice === "ios";
  const steps = stepsFor(normalizedDevice);

  return (
    <ProfissionalShell
      title="Instalar app"
      subtitle={isIos ? "Guia para iPhone" : "Guia para Android"}
    >
      <div className="space-y-4">
        <Link
          href="/app-profissional/inicio"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600"
        >
          <ChevronLeft size={16} />
          Voltar
        </Link>

        <section className="overflow-hidden rounded-[1.8rem] bg-zinc-950 p-5 text-white shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            {isIos ? <Share size={22} /> : <Download size={22} />}
          </div>
          <h2 className="mt-4 text-2xl font-black leading-tight">
            Deixe o app na tela inicial
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Assim o profissional abre agenda, clientes e comandas em segundos,
            sem passar pelo navegador.
          </p>
        </section>

        <section className="rounded-[1.6rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900">
            <Smartphone size={18} />
            Passo a passo
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">
                  {index + 1}
                </div>
                <div className="text-sm leading-6 text-zinc-700">{step}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ProfissionalShell>
  );
}
