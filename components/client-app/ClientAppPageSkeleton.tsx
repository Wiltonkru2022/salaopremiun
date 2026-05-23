import ClientAppFrame from "@/components/client-app/ClientAppFrame";

function SkeletonLine({
  className = "",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`animate-pulse rounded-full ${
        dark ? "bg-white/10" : "bg-zinc-200"
      } ${className}`}
    />
  );
}

function SkeletonPanel({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`rounded-[1.5rem] p-5 ${
        dark
          ? "border border-white/10 bg-[#101113]"
          : "border border-zinc-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      }`}
    >
      <SkeletonLine dark={dark} className="h-4 w-28" />
      <SkeletonLine dark={dark} className="mt-4 h-7 w-3/4" />
      <SkeletonLine dark={dark} className="mt-4 h-4 w-full" />
      <SkeletonLine dark={dark} className="mt-3 h-4 w-5/6" />
      <div className="mt-5 space-y-3">
        <SkeletonLine dark={dark} className="h-14 rounded-2xl" />
        <SkeletonLine dark={dark} className="h-14 rounded-2xl" />
      </div>
    </div>
  );
}

export default function ClientAppPageSkeleton({
  title = "Carregando",
  subtitle = "Preparando sua tela com segurança.",
  panels = 3,
  dark = false,
}: {
  title?: string;
  subtitle?: string;
  panels?: number;
  dark?: boolean;
}) {
  return (
    <ClientAppFrame title={title} subtitle={subtitle}>
      <section
        className={`mx-auto min-h-dvh max-w-3xl space-y-5 px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1rem)] ${
          dark ? "bg-[#050505] text-white" : "bg-white text-zinc-950"
        }`}
        aria-busy="true"
        aria-label="Carregando"
      >
        <div className="space-y-3">
          <SkeletonLine dark={dark} className="h-4 w-36" />
          <SkeletonLine dark={dark} className="h-9 w-64 max-w-full" />
          <SkeletonLine dark={dark} className="h-5 w-80 max-w-full" />
        </div>
        {Array.from({ length: panels }).map((_, index) => (
          <SkeletonPanel key={index} dark={dark} />
        ))}
      </section>
    </ClientAppFrame>
  );
}
