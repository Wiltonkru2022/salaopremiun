"use client";

type Props = {
  title: string;
  message?: string;
  fullHeight?: boolean;
  theme?: "painel" | "admin" | "profissional";
};

function toneClasses(theme: Props["theme"] = "painel") {
  if (theme === "admin") {
    return {
      shell:
        "border-zinc-800/80 bg-[linear-gradient(180deg,#18181b_0%,#0f172a_100%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]",
      badge: "border-white/10 bg-white/10 text-white/80",
      line: "bg-white/10",
      lineSoft: "bg-white/5",
      dot: "bg-amber-300",
    };
  }

  if (theme === "profissional") {
    return {
      shell:
        "border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,250,251,0.94)_100%)] text-zinc-950 shadow-[0_24px_80px_rgba(15,23,42,0.09)]",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      line: "bg-zinc-200",
      lineSoft: "bg-zinc-100",
      dot: "bg-amber-400",
    };
  }

  return {
    shell:
      "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,249,252,0.96)_100%)] text-zinc-950 shadow-[0_24px_80px_rgba(15,23,42,0.08)]",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    line: "bg-zinc-200",
    lineSoft: "bg-zinc-100",
    dot: "bg-violet-500",
  };
}

export default function AppLoading({
  title,
  message = "Aguarde enquanto organizamos os dados da tela para voce.",
  fullHeight = true,
  theme = "painel",
}: Props) {
  const tone = toneClasses(theme);

  return (
    <div
      className={
        fullHeight
          ? "flex min-h-[44vh] items-center justify-center p-5"
          : "p-5"
      }
    >
      <div className={`w-full max-w-[760px] overflow-hidden rounded-[24px] border p-5 ${tone.shell}`}>
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.badge}`}
              >
                <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${tone.dot}`} />
                Aguarde
              </div>
              <h2 className="mt-2.5 text-[1.55rem] font-semibold tracking-[-0.05em]">
                {title}
              </h2>
              <p className="mt-1.5 max-w-[34rem] text-sm leading-6 opacity-75">
                {message}
              </p>
            </div>

            <div className="hidden items-center gap-1.5 sm:flex">
              <span className={`h-2.5 w-2.5 animate-bounce rounded-full ${tone.dot}`} />
              <span
                className={`h-2.5 w-2.5 animate-bounce rounded-full ${tone.dot}`}
                style={{ animationDelay: "0.12s" }}
              />
              <span
                className={`h-2.5 w-2.5 animate-bounce rounded-full ${tone.dot}`}
                style={{ animationDelay: "0.24s" }}
              />
            </div>
          </div>

          <div className="grid gap-3.5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3.5">
              <div className={`h-12 animate-pulse rounded-[18px] ${tone.line}`} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={`h-24 animate-pulse rounded-[20px] ${tone.lineSoft}`} />
                <div className={`h-24 animate-pulse rounded-[20px] ${tone.lineSoft}`} />
              </div>
              <div className={`h-36 animate-pulse rounded-[22px] ${tone.lineSoft}`} />
            </div>

            <div className="space-y-3.5">
              <div className={`h-20 animate-pulse rounded-[20px] ${tone.line}`} />
              <div className={`h-20 animate-pulse rounded-[20px] ${tone.lineSoft}`} />
              <div className={`h-20 animate-pulse rounded-[20px] ${tone.lineSoft}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
