import ClientAppFrame from "@/components/client-app/ClientAppFrame";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-zinc-200 ${className}`} />;
}

function SkeletonPanel() {
  return (
    <div className="rounded-[1.6rem] border border-white/70 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="mt-3 h-7 w-3/4" />
      <SkeletonLine className="mt-3 h-4 w-full" />
      <SkeletonLine className="mt-2 h-4 w-5/6" />
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <SkeletonLine className="h-10 rounded-2xl" />
        <SkeletonLine className="h-10 rounded-2xl" />
        <SkeletonLine className="h-10 rounded-2xl" />
      </div>
    </div>
  );
}

export default function ClientAppPageSkeleton({
  title = "Carregando",
  subtitle = "Preparando sua tela com seguranca.",
  panels = 3,
}: {
  title?: string;
  subtitle?: string;
  panels?: number;
}) {
  return (
    <ClientAppFrame title={title} subtitle={subtitle}>
      <section className="space-y-4" aria-busy="true" aria-label="Carregando">
        {Array.from({ length: panels }).map((_, index) => (
          <SkeletonPanel key={index} />
        ))}
      </section>
    </ClientAppFrame>
  );
}
