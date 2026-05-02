type Props = {
  label: string;
  value: string;
  helper?: string;
};

export default function ProfissionalStatCard({
  label,
  value,
  helper,
}: Props) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[1.2rem] border border-zinc-200 bg-white p-3.5 shadow-sm">
      <div className="break-words text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>

      <div className="mt-2.5 break-words text-[1.35rem] font-bold leading-tight text-zinc-950 sm:text-[1.65rem]">
        {value}
      </div>

      {helper ? (
        <div className="mt-1.5 break-words text-sm text-zinc-500">
          {helper}
        </div>
      ) : null}
    </div>
  );
}
