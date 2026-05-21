import Link from "next/link";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { headers } from "next/headers";
import { ChevronLeft, Download, Share, Smartphone } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";

type SearchParams = Promise<{
  device?: string;
}>;

const APK_PUBLIC_PATH = "/downloads/app-profissional.apk";

function detectDeviceFromUserAgent(userAgent?: string | null) {
  const ua = String(userAgent || "").toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "";
}

async function hasAndroidApk() {
  try {
    await access(
      join(process.cwd(), "public", APK_PUBLIC_PATH.replace(/^\//, "")),
      constants.R_OK
    );
    return true;
  } catch {
    return false;
  }
}

function stepsFor(device: string, apkAvailable: boolean) {
  if (device === "ios") {
    return [
      "Abra esta página no Safari do iPhone.",
      "Toque em Baixar perfil iOS.",
      "Abra Ajustes e toque em Perfil Baixado.",
      "Confirme a instalação do App Profissional.",
    ];
  }

  if (device === "android") {
    return apkAvailable
      ? [
          "Abra esta página no Android.",
          "Toque em Baixar APK.",
          "Autorize instalar apps deste navegador, se o Android pedir.",
          "Abra o App Profissional instalado.",
        ]
      : [
          "Abra esta página no Chrome do Android.",
          "Toque em Instalar app, se aparecer.",
          "Se não aparecer, abra o menu de três pontos.",
          "Escolha Adicionar à tela inicial.",
        ];
  }

  return [
    "Abra o app no navegador principal do aparelho.",
    "Use o botão indicado para iOS ou Android.",
    "Confirme a instalação.",
    "Depois, abra pelo ícone App Profissional.",
  ];
}

export default async function InstalarAppProfissionalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { device = "" } = await searchParams;
  const requestHeaders = await headers();
  const normalizedDevice =
    String(device || "").toLowerCase() ||
    detectDeviceFromUserAgent(requestHeaders.get("user-agent"));
  const isIos = normalizedDevice === "ios";
  const isAndroid = normalizedDevice === "android";
  const apkAvailable = await hasAndroidApk();
  const steps = stepsFor(normalizedDevice, apkAvailable);

  return (
    <ProfissionalShell
      title="Instalar app"
      subtitle={
        isIos
          ? "Guia para iPhone"
          : isAndroid
            ? "Guia para Android"
            : "Guia de instalação"
      }
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
            Instale o App Profissional
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            O app é o mesmo em todos os atalhos: agenda, clientes e comandas do
            App Profissional do SalãoPremium.
          </p>
        </section>

        {isIos ? (
          <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-3.5 shadow-sm">
            <div className="text-sm font-black text-amber-950">
              Perfil de configuração iOS
            </div>
            <p className="mt-1.5 text-sm leading-6 text-amber-900">
              Instala o App Profissional pelo app Ajustes do iPhone. O ícone
              abre o mesmo app profissional usado no navegador.
            </p>
            <a
              href="/app-profissional/ios-perfil/app-profissional.mobileconfig"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white"
            >
              <Download size={17} />
              Baixar perfil iOS
            </a>
          </section>
        ) : null}

        {isAndroid ? (
          <section className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-3.5 shadow-sm">
            <div className="text-sm font-black text-emerald-950">
              APK Android
            </div>
            <p className="mt-1.5 text-sm leading-6 text-emerald-900">
              O APK instala o mesmo App Profissional no Android. Quando o APK
              estiver publicado, o botão abaixo baixa o arquivo direto.
            </p>
            {apkAvailable ? (
              <a
                href={APK_PUBLIC_PATH}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white"
              >
                <Download size={17} />
                Baixar APK
              </a>
            ) : (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-white/70 px-3 py-2.5 text-sm font-bold text-emerald-950">
                APK ainda não publicado. Por enquanto, use a instalação pelo
                Chrome.
              </div>
            )}
          </section>
        ) : null}

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
      </div>
    </ProfissionalShell>
  );
}
