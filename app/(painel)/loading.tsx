export default function PainelLoading() {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white p-6 shadow-sm">
        <div className="h-4 w-36 animate-pulse rounded-full bg-zinc-200" />
        <div className="mt-4 h-9 w-72 max-w-full animate-pulse rounded-2xl bg-zinc-200" />
        <div className="mt-3 h-4 w-[520px] max-w-full animate-pulse rounded-full bg-zinc-100" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-zinc-100" />
            <div className="mt-5 h-7 w-24 animate-pulse rounded-xl bg-zinc-200" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded-full bg-zinc-100" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="min-h-72 rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="h-5 w-40 animate-pulse rounded-full bg-zinc-200" />
            <div className="mt-5 space-y-3">
              <div className="h-4 w-full animate-pulse rounded-full bg-zinc-100" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-zinc-100" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
