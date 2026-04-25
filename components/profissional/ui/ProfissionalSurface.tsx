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
      className={`rounded-[1.6rem] border border-zinc-200/80 bg-white/96 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] ${className}`.trim()}
    >
      {children}
    </section>
  );
}
