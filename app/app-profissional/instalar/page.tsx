import Link from "next/link";
import { ChevronLeft, Download, Share, Smartphone } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";

type SearchParams = Promise<{
  device?: string;
}>;

function stepsFor(device: string) {
  if (device === "ios") {
    return [
      "Abra esta página no Safari do iPhone.",
      "Toque no botão de compartilhar.",
      "Escolha Adicionar à Tela de Início.",
      "Confirme em Adicionar.",
    ];
  }

  if (device === "android") {
    return [
      "Abra esta página no Chrome do Android.",
      "Toque em Instalar app, se aparecer.",
      "Se não aparecer, abra o menu de três pontos.",
      "Escolha Adicionar a tela inicial.",
    ];
  }

  return [
    "Abra o app no navegador principal do aparelho.",
    "Procure por Instalar app ou Adicionar a tela inicial.",
    "Confirme o atalho.",
    "Depois abra pelo icone SalãoPremium.",
  ];
}

export default async function InstalarAppProfissionalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { device = "" } = await searchParams;
  const normalizedDevice = String(device || "").toLowerCase();
  const isIos = normalizedDevice === "ios";
  const steps = stepsFor(normalizedDevice);

  return (
    <ProfissionalShell
      title="Instalar app"
      subtitle={isIos ? "Guia para iPhone" : "Guia para Android"}
    >
      <div className="space-y-3.5">
        <Link
          href="/app-profissional/inicio"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600"
        >
          <ChevronLeft size={16} />
          Voltar
        </Link>

        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 p-4 text-white shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-white/10">
            {isIos ? <Share size={22} /> : <Download size={22} />}
          </div>
          <h2 className="mt-3 text-[1.35rem] font-black leading-tight">
            Deixe o app na tela inicial
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Assim o profissional abre agenda, clientes e comandas em segundos,
            sem passar pelo navegador.
          </p>
        </section>

        <section className="rounded-[1.4rem] border border-zinc-200 bg-white p-3.5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900">
            <Smartphone size={18} />
            Passo a passo
          </div>

          <div className="space-y-2.5">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex gap-3 rounded-[18px] border border-zinc-100 bg-zinc-50 p-2.5"
              >
                <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-[11px] font-bold text-white">
                  {index + 1}
                </div>
                <div className="text-sm leading-6 text-zinc-700">{step}</div>
              </div>
            ))}
          </div>
        </section>

        {isIos ? (
          <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-3.5 shadow-sm">
            <div className="text-sm font-black text-amber-950">
              Perfil de configuraÃ§Ã£o para teste
            </div>
            <p className="mt-1.5 text-sm leading-6 text-amber-900">
              Instala um Ã­cone de teste do App Profissional pelo app Ajustes do
              iPhone. Use apenas para validaÃ§Ã£o interna.
            </p>
            <a
              href="/app-profissional/ios-perfil/salaopro-teste.mobileconfig"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white"
            >
              <Download size={17} />
              Baixar perfil iOS teste
            </a>
          </section>
        ) : null}
      </div>
    </ProfissionalShell>
  );
}
