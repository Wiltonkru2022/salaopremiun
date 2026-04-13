type Permissoes = Record<string, boolean>;

type Props = {
  userName?: string;
  userEmail?: string;
  permissoes: Permissoes;
  nivel: string;
};

export default function Header({
  userName,
  userEmail,
  permissoes,
  nivel,
}: Props) {
  return (
    <header className="flex h-[132px] items-center justify-between gap-4">
      <div className="min-w-0 rounded-[28px] border border-zinc-300 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Painel do Salão
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Controle completo da operação, agenda e financeiro
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
            Nível: {nivel}
          </span>

          {permissoes?.dashboard_ver && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              Dashboard liberado
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 rounded-[24px] border border-zinc-300 bg-white px-4 py-3 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
          {userName?.slice(0, 1)?.toUpperCase() || "U"}
        </div>

        <div className="hidden min-w-0 text-right sm:block">
          <div className="truncate text-sm font-semibold text-zinc-900">
            {userName || "Usuário"}
          </div>
          <div className="truncate text-xs text-zinc-500">
            {userEmail || ""}
          </div>
        </div>
      </div>
    </header>
  );
}