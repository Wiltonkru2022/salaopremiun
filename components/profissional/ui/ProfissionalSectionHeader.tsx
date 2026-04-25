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
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[1rem] font-bold tracking-[-0.02em] text-zinc-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
