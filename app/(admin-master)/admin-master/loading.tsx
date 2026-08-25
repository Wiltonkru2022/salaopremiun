export default function AdminMasterLoading() {
  return (
    <div className="space-y-5 animate-pulse" aria-label="Carregando Admin Master">
      <div className="h-4 w-40 rounded bg-zinc-200" />
      <section className="rounded-3xl border border-zinc-200 bg-white p-6">
        <div className="h-3 w-28 rounded bg-violet-100" />
        <div className="mt-3 h-8 w-64 max-w-full rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded bg-zinc-100" />
        <div className="mt-2 h-4 w-4/5 max-w-xl rounded bg-zinc-100" />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="h-3 w-24 rounded bg-zinc-100" />
            <div className="mt-4 h-7 w-20 rounded bg-zinc-200" />
            <div className="mt-3 h-3 w-32 rounded bg-zinc-100" />
          </div>
        ))}
      </section>
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="h-14 border-b border-zinc-100 bg-zinc-50/50" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex gap-4 border-b border-zinc-100 px-4 py-4 last:border-0">
            <div className="h-4 w-1/4 rounded bg-zinc-100" />
            <div className="h-4 w-1/3 rounded bg-zinc-100" />
            <div className="h-4 w-1/5 rounded bg-zinc-100" />
          </div>
        ))}
      </section>
    </div>
  );
}
