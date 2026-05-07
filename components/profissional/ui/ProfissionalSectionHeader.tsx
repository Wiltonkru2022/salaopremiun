import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function ProfissionalSectionHeader({
  title,
  description,
  action,
}: Props) {
  return (
    <div className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="break-words text-[1rem] font-bold tracking-[-0.02em] text-zinc-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 break-words text-sm leading-5 text-zinc-500">{description}</p>
        ) : null}
      </div>

      {action ? <div className="min-w-0 shrink-0">{action}</div> : null}
    </div>
  );
}
