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
    <div className="min-w-0 overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="break-words text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </div>

      <div className="mt-3 break-words text-[1.55rem] font-bold leading-tight text-zinc-950 sm:text-[1.9rem]">
        {value}
      </div>

      {helper ? (
        <div className="mt-2 break-words text-sm text-zinc-500">
          {helper}
        </div>
      ) : null}
    </div>
  );
}
