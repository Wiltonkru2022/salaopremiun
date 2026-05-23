function Bar({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-full bg-white/10 ${className}`} />
  );
}

function DarkPanel() {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-[#101113] p-5">
      <Bar className="h-4 w-28" />
      <Bar className="mt-4 h-7 w-3/4" />
      <Bar className="mt-4 h-4 w-full" />
      <Bar className="mt-3 h-4 w-5/6" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Bar className="h-14 rounded-2xl" />
        <Bar className="h-14 rounded-2xl" />
        <Bar className="h-14 rounded-2xl" />
      </div>
    </div>
  );
}

export default function ClienteAppLoading() {
  return (
    <section
      className="min-h-dvh bg-[#050505] px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.5rem)] text-white"
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="mx-auto max-w-md space-y-5">
        <div className="space-y-3">
          <Bar className="h-5 w-44" />
          <Bar className="h-10 w-72 max-w-full" />
          <Bar className="h-5 w-56 max-w-full" />
        </div>
        <DarkPanel />
        <DarkPanel />
        <DarkPanel />
      </div>
    </section>
  );
}
