export default function AdminMasterLoading() {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 rounded-full bg-white/15" />
          <div className="h-12 w-full max-w-3xl rounded-2xl bg-white/10" />
          <div className="h-4 w-full max-w-2xl rounded-full bg-white/10" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-[22px] bg-white/10" />
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-[28px] border border-zinc-200 bg-white shadow-sm"
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="h-[340px] animate-pulse rounded-[30px] border border-zinc-200 bg-white shadow-sm" />
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-[28px] border border-zinc-200 bg-white shadow-sm" />
          <div className="h-28 animate-pulse rounded-[28px] border border-zinc-200 bg-amber-50 shadow-sm" />
        </div>
      </div>
    </div>
  );
}
