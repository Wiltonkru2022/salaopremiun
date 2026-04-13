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
    <main className="min-h-screen bg-[#f7f4fa] text-zinc-900">
      <SiteHeader />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6b2c98]">
            Institucional
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
            {subtitle}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14 lg:px-10">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm lg:p-10">
          <div className="prose prose-zinc max-w-none prose-headings:scroll-mt-24">
            {children}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}