function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-3xl bg-white/80 ${className}`} />;
}

export default function AppProfissionalLoading() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff7df_0,#f5f5f5_36%,#eceff3_100%)]">
      <div className="fixed inset-x-0 top-0 z-[80] h-1 origin-left animate-pulse bg-[linear-gradient(90deg,#c89b3c_0%,#f5d98e_45%,#c89b3c_100%)] shadow-[0_0_16px_rgba(200,155,60,0.45)]" />

      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#f5f5f5]/95 shadow-[0_0_80px_rgba(15,23,42,0.08)] sm:max-w-lg lg:max-w-2xl">
        <div className="sticky top-0 z-30 border-b border-white/60 bg-white/88 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-7 w-40" />
            </div>
            <SkeletonBlock className="h-12 w-12 rounded-full" />
          </div>
        </div>

        <main className="min-w-0 flex-1 px-3 pb-28 pt-3 sm:px-4 sm:pt-4">
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/70 bg-white/88 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
              <div className="space-y-3">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-4/5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
            </div>

            <SkeletonBlock className="h-40 w-full" />
            <SkeletonBlock className="h-40 w-full" />
          </div>
        </main>

        <div className="sticky bottom-0 border-t border-white/60 bg-white/92 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur-2xl">
          <div className="grid grid-cols-5 gap-2">
            <SkeletonBlock className="h-14 w-full rounded-2xl" />
            <SkeletonBlock className="h-14 w-full rounded-2xl" />
            <SkeletonBlock className="h-14 w-full rounded-2xl" />
            <SkeletonBlock className="h-14 w-full rounded-2xl" />
            <SkeletonBlock className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
