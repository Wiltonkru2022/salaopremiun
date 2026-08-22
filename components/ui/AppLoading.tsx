"use client";

import clsx from "clsx";

type Props = {
  title: string;
  message?: string;
  fullHeight?: boolean;
  theme?: "painel" | "admin" | "profissional";
};

function toneClasses(theme: Props["theme"] = "painel") {
  if (theme === "admin") {
    return {
      shell: "border-zinc-800 bg-zinc-950 text-white",
      badge: "border-amber-300/25 bg-amber-300/10 text-amber-200",
      line: "bg-white/10",
      lineSoft: "bg-white/5",
      text: "text-zinc-300",
      eyebrow: "text-amber-200",
    };
  }

  if (theme === "profissional") {
    return {
      shell: "border-zinc-200 bg-white text-zinc-950",
      badge: "border-amber-200 bg-amber-50 text-amber-800",
      line: "bg-zinc-200",
      lineSoft: "bg-zinc-100",
      text: "text-zinc-500",
      eyebrow: "text-amber-700",
    };
  }

  return {
    shell: "border-zinc-200 bg-white text-zinc-950",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    line: "bg-zinc-200",
    lineSoft: "bg-zinc-100",
    text: "text-zinc-500",
    eyebrow: "text-amber-700",
  };
}

export default function AppLoading({
  title,
  message = "Atualizando dados da tela.",
  fullHeight = true,
  theme = "painel",
}: Props) {
  const tone = toneClasses(theme);
  const shellSize = theme === "painel" ? "max-w-[1180px]" : "max-w-[760px]";

  return (
    <div
      aria-busy="true"
      aria-label={message ? `${title}. ${message}` : title}
      className={clsx(
        "w-full",
        fullHeight
          ? "flex min-h-[52vh] items-start justify-center px-3 py-4 sm:px-4"
          : "px-0 py-0"
      )}
    >
      <div
        className={clsx(
          "w-full overflow-hidden rounded-xl border p-4 shadow-sm sm:p-5",
          shellSize,
          tone.shell
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={clsx(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-[11px] font-black uppercase tracking-[0.16em]",
                  tone.badge
                )}
                aria-hidden="true"
              >
                SP
              </span>
              <div className="min-w-0">
                <p
                  className={clsx(
                    "text-[10px] font-black uppercase tracking-[0.18em]",
                    tone.eyebrow
                  )}
                >
                  Preparando tela
                </p>
                <h2 className="mt-1 text-base font-black leading-tight tracking-normal sm:text-lg">
                  {title}
                </h2>
                {message ? (
                  <p className={clsx("mt-1 max-w-2xl text-sm leading-5", tone.text)}>
                    {message}
                  </p>
                ) : null}
              </div>
            </div>

            <span
              className={clsx(
                "mt-1 hidden h-2 w-24 overflow-hidden rounded-full sm:block",
                tone.lineSoft
              )}
              aria-hidden="true"
            >
              <span className="block h-full w-1/2 animate-pulse rounded-full bg-[var(--app-accent)]" />
            </span>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              <div className={clsx("h-12 animate-pulse rounded-lg", tone.line)} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={clsx("h-24 animate-pulse rounded-lg", tone.lineSoft)} />
                <div className={clsx("h-24 animate-pulse rounded-lg", tone.lineSoft)} />
                <div className={clsx("h-24 animate-pulse rounded-lg", tone.lineSoft)} />
              </div>
              <div className={clsx("h-40 animate-pulse rounded-lg", tone.lineSoft)} />
            </div>

            <div className="space-y-3">
              <div className={clsx("h-20 animate-pulse rounded-lg", tone.line)} />
              <div className={clsx("h-20 animate-pulse rounded-lg", tone.lineSoft)} />
              <div className={clsx("h-20 animate-pulse rounded-lg", tone.lineSoft)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
