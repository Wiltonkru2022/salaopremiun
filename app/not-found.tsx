import Link from "next/link";
import {
  getAppClienteUrl,
  getAppProfissionalUrl,
  getAssinaturaUrl,
  getCadastroUrl,
  getPainelUrl,
  getRootUrl,
} from "@/lib/site-urls";

const atalhos = [
  {
    label: "Ir para o site",
    href: getRootUrl(),
  },
  {
    label: "Painel do salão",
    href: getPainelUrl("/dashboard"),
  },
  {
    label: "App cliente",
    href: getAppClienteUrl("/app-cliente"),
  },
  {
    label: "App profissional",
    href: getAppProfissionalUrl("/app-profissional/inicio"),
  },
  {
    label: "Cadastro do salão",
    href: getCadastroUrl(),
  },
  {
    label: "Assinatura",
    href: getAssinaturaUrl(),
  },
];

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-slate-50 px-5 py-10 text-zinc-950">
      <section className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col items-center justify-center text-center">
        <div className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500 shadow-sm">
          Página não encontrada
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
          Esse link não existe ou mudou de lugar.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
          Escolha um dos acessos abaixo para voltar ao fluxo correto do
          SalãoPremium.
        </p>

        <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
          {atalhos.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-900 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
