import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-zinc-200 ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-[1.45rem] border border-white/70 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 animate-pulse rounded-[1.1rem] bg-zinc-200" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-5 w-2/3" />
          <SkeletonLine className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <SkeletonLine className="h-14 w-full rounded-2xl" />
        <SkeletonLine className="h-14 w-full rounded-2xl" />
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export default function AppProfissionalLoading() {
  return (
    <ProfissionalShell title="Carregando" subtitle="Preparando sua experiência.">
      <section className="space-y-4" aria-busy="true" aria-label="Carregando">
        <div className="rounded-[1.6rem] border border-white/70 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="mt-3 h-8 w-56 max-w-full" />
          <div className="mt-4 grid gap-3">
            <SkeletonLine className="h-12 w-full rounded-2xl" />
            <SkeletonLine className="h-12 w-44 rounded-2xl" />
          </div>
        </div>

        <SkeletonCard />
        <SkeletonCard />
      </section>
    </ProfissionalShell>
  );
}
