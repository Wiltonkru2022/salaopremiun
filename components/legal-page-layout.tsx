import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { FileText, ShieldCheck } from "lucide-react";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function LegalPageLayout({
  title,
  subtitle,
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1fr_320px] lg:px-10 lg:py-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--app-accent-strong)]">
              <FileText size={14} />
              Documento legal
            </p>
            <h1 className="mt-4 font-display text-[2.35rem] font-black tracking-[-0.04em] text-zinc-950 lg:text-[3rem]">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-zinc-600 lg:text-base">
              {subtitle}
            </p>
          </div>

          <aside className="rounded-[24px] border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] text-zinc-950">
              <ShieldCheck size={18} />
            </div>
            <h2 className="mt-4 text-lg font-black">Transparência e segurança</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Documento público do SalãoPremium para orientar clientes,
              profissionais e salões sobre regras de uso e tratamento de dados.
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/75">
              Última atualização: maio de 2026
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 lg:px-10 lg:py-10">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm lg:p-8">
          <div className="prose prose-zinc max-w-none prose-headings:scroll-mt-24 prose-headings:font-black prose-h2:mt-12 prose-h2:border-t prose-h2:border-zinc-100 prose-h2:pt-8 prose-h2:text-xl prose-h2:text-zinc-950 prose-p:leading-8 prose-li:leading-8 prose-strong:font-black prose-strong:text-zinc-950">
            {children}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
