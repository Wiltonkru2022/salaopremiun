import clsx from "clsx";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-zinc-100", className)} />;
}

export function PainelTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SkeletonBlock className="h-9 w-48" />
        <SkeletonBlock className="h-9 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-zinc-100 bg-white p-3 sm:grid-cols-[1.4fr_1fr_0.7fr_0.7fr]"
          >
            <SkeletonBlock className="h-5" />
            <SkeletonBlock className="h-5" />
            <SkeletonBlock className="h-5" />
            <SkeletonBlock className="h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PainelDashboardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-32" />
            <SkeletonBlock className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-72" />
      </div>
    </div>
  );
}

export function PainelAgendaSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <SkeletonBlock className="h-10 w-40" />
          <SkeletonBlock className="h-10 w-32" />
          <SkeletonBlock className="h-10 w-52" />
        </div>
      </div>
      <div className="grid min-h-[520px] gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, columnIndex) => (
          <div key={columnIndex} className="space-y-2 rounded-lg border border-zinc-100 p-2">
            <SkeletonBlock className="h-8" />
            {Array.from({ length: 6 }).map((__, rowIndex) => (
              <SkeletonBlock key={rowIndex} className="h-16" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
