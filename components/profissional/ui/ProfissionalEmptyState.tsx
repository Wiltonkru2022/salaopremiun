import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function ProfissionalEmptyState({
  title,
  description,
  action,
}: Props) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-5 text-center">
      <div className="text-base font-bold tracking-[-0.02em] text-zinc-950">
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
