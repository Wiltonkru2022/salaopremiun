import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

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
    <main className="min-h-screen bg-white text-zinc-900">
      <SiteHeader />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-9 lg:px-10 lg:py-11">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#6b2c98]">
            Institucional
          </p>
          <h1 className="mt-2 text-[2.1rem] font-bold tracking-tight text-zinc-950 lg:text-[2.6rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-zinc-600 lg:text-base">
            {subtitle}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-8 lg:px-10 lg:py-10">
        <div className="rounded-[20px] border border-zinc-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="prose prose-zinc max-w-none prose-headings:scroll-mt-24">
            {children}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
