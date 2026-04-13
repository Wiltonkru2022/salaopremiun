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
    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </div>

      <div className="mt-3 text-[1.9rem] font-bold leading-none text-zinc-950">
        {value}
      </div>

      {helper ? (
        <div className="mt-2 text-sm text-zinc-500">
          {helper}
        </div>
      ) : null}
    </div>
  );
}