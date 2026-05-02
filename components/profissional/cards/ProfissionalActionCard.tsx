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
    <div className="flex min-h-[106px] min-w-0 flex-col justify-between overflow-hidden rounded-[1.2rem] border border-zinc-200 bg-white p-3.5 shadow-sm transition active:scale-[0.99]">
      <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#f8f3e7] text-[#c89b3c] shadow-sm">
        {icon}
      </div>

      <div className="mt-3 min-w-0">
        <div className="break-words text-[15px] font-semibold leading-5 text-zinc-950">
          {title}
        </div>

        {subtitle ? (
          <div className="mt-1 break-words text-sm leading-5 text-zinc-500">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
