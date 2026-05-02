import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function ProfissionalSurface({
  children,
  className = "",
}: Props) {
  return (
    <section
      className={`rounded-[1.35rem] border border-zinc-200/80 bg-white/96 p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] ${className}`.trim()}
    >
      {children}
    </section>
  );
}
