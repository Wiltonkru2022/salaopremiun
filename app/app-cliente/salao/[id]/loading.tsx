function Bar({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-full bg-white/10 ${className}`} />
  );
}

export default function ClienteSalaoLoading() {
  return (
    <section className="min-h-dvh bg-[#050505] px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.5rem)] text-white">
      <div
        className="mx-auto max-w-md space-y-5"
        aria-busy="true"
        aria-label="Carregando salão"
      >
        <div className="h-[330px] animate-pulse rounded-[1.8rem] bg-white/10" />
        <div className="rounded-[1.8rem] border border-white/10 bg-[#101113] p-5">
          <Bar className="h-9 w-4/5" />
          <Bar className="mt-5 h-5 w-full" />
          <Bar className="mt-4 h-5 w-3/4" />
          <div className="mt-7 flex gap-3">
            <Bar className="h-12 flex-1" />
            <Bar className="h-12 flex-1" />
          </div>
        </div>
        {[0, 1].map((item) => (
          <div
            key={item}
            className="rounded-[1.8rem] border border-white/10 bg-[#101113] p-5"
          >
            <Bar className="h-5 w-32" />
            <Bar className="mt-5 h-16 w-full rounded-2xl" />
            <Bar className="mt-4 h-16 w-full rounded-2xl" />
            <Bar className="mt-4 h-16 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </section>
  );
}
