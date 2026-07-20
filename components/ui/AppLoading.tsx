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
      line: "bg-white/10",
      lineSoft: "bg-white/5",
      dot: "bg-amber-300",
    };
  }

  if (theme === "profissional") {
    return {
      shell:
        "border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,250,251,0.94)_100%)] text-zinc-950 shadow-[0_24px_80px_rgba(15,23,42,0.09)]",
      line: "bg-zinc-200",
      lineSoft: "bg-zinc-100",
      dot: "bg-amber-400",
    };
  }

  return {
    shell:
      "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,249,252,0.96)_100%)] text-zinc-950 shadow-[0_24px_80px_rgba(15,23,42,0.08)]",
    line: "bg-zinc-200",
    lineSoft: "bg-zinc-100",
    dot: "bg-violet-500",
  };
}

export default function AppLoading({
  title,
  message = "Atualizando dados da tela.",
  fullHeight = true,
  theme = "painel",
}: Props) {
  const tone = toneClasses(theme);
  const shellSize =
    theme === "painel"
      ? "max-w-[1180px] min-h-[390px]"
      : "max-w-[760px]";

  return (
    <div
      aria-busy="true"
      aria-label={message ? `${title}. ${message}` : title}
      className={
        fullHeight
          ? "flex min-h-[52vh] w-full items-center justify-center p-5"
          : "w-full p-5"
      }
    >
      <div
        className={`w-full overflow-hidden rounded-[24px] border p-5 ${shellSize} ${tone.shell}`}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-end gap-1.5" aria-hidden="true">
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

          <div className="grid flex-1 gap-3.5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3.5">
              <div className={`h-14 animate-pulse rounded-[18px] ${tone.line}`} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={`h-28 animate-pulse rounded-[20px] ${tone.lineSoft}`} />
                <div className={`h-28 animate-pulse rounded-[20px] ${tone.lineSoft}`} />
              </div>
              <div className={`h-40 animate-pulse rounded-[22px] ${tone.lineSoft}`} />
            </div>

            <div className="space-y-3.5">
              <div className={`h-24 animate-pulse rounded-[20px] ${tone.line}`} />
              <div className={`h-24 animate-pulse rounded-[20px] ${tone.lineSoft}`} />
              <div className={`h-24 animate-pulse rounded-[20px] ${tone.lineSoft}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
