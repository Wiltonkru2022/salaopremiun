import ClientAppFrame from "@/components/client-app/ClientAppFrame";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-zinc-200 ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[1.45rem] border border-zinc-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="h-40 animate-pulse bg-zinc-200" />
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 animate-pulse rounded-[1.2rem] bg-zinc-200" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-5 w-2/3" />
            <SkeletonLine className="h-4 w-1/2" />
          </div>
        </div>
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-5/6" />
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
          <SkeletonLine className="mx-auto h-8 w-12" />
          <SkeletonLine className="mx-auto h-8 w-12" />
          <SkeletonLine className="mx-auto h-8 w-12" />
        </div>
      </div>
    </div>
  );
}

export default function ClienteAppLoading() {
  return (
    <ClientAppFrame title="Carregando" subtitle="Preparando sua experiencia.">
      <section className="space-y-4" aria-busy="true" aria-label="Carregando">
        <div className="rounded-[1.6rem] border border-white/70 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="mt-3 h-8 w-64 max-w-full" />
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_auto]">
            <SkeletonLine className="h-12 w-full rounded-2xl" />
            <SkeletonLine className="h-12 w-40 rounded-2xl" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </ClientAppFrame>
  );
}
