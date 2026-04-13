import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
};

export default function ProfissionalActionCard({
  icon,
  title,
  subtitle,
}: Props) {
  return (
    <div className="flex min-h-[122px] flex-col justify-between rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm transition active:scale-[0.99]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8f3e7] text-[#c89b3c] shadow-sm">
        {icon}
      </div>

      <div className="mt-4">
        <div className="text-[1rem] font-semibold leading-5 text-zinc-950">
          {title}
        </div>

        {subtitle ? (
          <div className="mt-1.5 text-sm leading-5 text-zinc-500">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}