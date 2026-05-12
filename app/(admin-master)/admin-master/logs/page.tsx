import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import type { AdminSectionData, AdminTableRow } from "@/lib/admin-master/data";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function rowMatches(row: AdminTableRow, query: string) {
  if (!query) return true;
  const haystack = Object.values(row).map(normalize).join(" ");
  return haystack.includes(query);
}

function filterLogs(data: AdminSectionData, params: { busca?: string; modulo?: string; gravidade?: string }) {
  const busca = normalize(params.busca);
  const modulo = normalize(params.modulo);
  const gravidade = normalize(params.gravidade);

  const rows = data.rows.filter((row) => {
    if (!rowMatches(row, busca)) return false;
    if (modulo && normalize(row.modulo) !== modulo) return false;
    if (gravidade && normalize(row.gravidade) !== gravidade) return false;
    return true;
  });

  return {
    ...data,
    rows,
    diagnostics: [
      ...(data.diagnostics || []),
      {
        label: "Filtro atual",
        value: `${rows.length}/${data.rows.length}`,
        detail:
          busca || modulo || gravidade
            ? "Mostrando apenas os logs que combinam com a busca e filtros selecionados."
            : "Sem filtro aplicado. Use busca, módulo ou gravidade para investigar mais rápido.",
        tone: busca || modulo || gravidade ? "blue" : "green",
      },
    ],
  } satisfies AdminSectionData;
}

function uniqueOptions(rows: AdminTableRow[], key: string) {
  return Array.from(
    new Set(
      rows
        .map((row) => String(row[key] || "").trim())
        .filter((value) => value && value !== "-")
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function LogsFilterBar({
  rows,
  busca,
  modulo,
  gravidade,
}: {
  rows: AdminTableRow[];
  busca: string;
  modulo: string;
  gravidade: string;
}) {
  const modulos = uniqueOptions(rows, "modulo");
  const gravidades = uniqueOptions(rows, "gravidade");

  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
            Investigação rápida
          </div>
          <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
            Filtrar logs, falhas e auditoria
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Busque por salão, rota, referência, payload, módulo ou ID para sair do problema e chegar na causa.
          </p>
        </div>
        <form className="grid flex-[1.4] gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto]">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Busca
            </span>
            <input
              name="busca"
              defaultValue={busca}
              placeholder="ID, salão, rota, erro..."
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Módulo
            </span>
            <select
              name="modulo"
              defaultValue={modulo}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
            >
              <option value="">Todos</option>
              {modulos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Gravidade
            </span>
            <select
              name="gravidade"
              defaultValue={gravidade}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
            >
              <option value="">Todas</option>
              {gravidades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800 md:self-end"
          >
            Filtrar
          </button>
          <a
            href="/admin-master/logs"
            className="rounded-2xl border border-zinc-200 px-5 py-3 text-center text-sm font-black text-zinc-800 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white md:self-end"
          >
            Limpar
          </a>
        </form>
      </div>
    </section>
  );
}

export default async function AdminMasterLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ busca?: string; modulo?: string; gravidade?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const data = await getAdminMasterSection("logs");
  const filteredData = filterLogs(data, {
    busca: params.busca,
    modulo: params.modulo,
    gravidade: params.gravidade,
  });

  return (
    <div className="space-y-6">
      <LogsFilterBar
        rows={data.rows}
        busca={params.busca || ""}
        modulo={params.modulo || ""}
        gravidade={params.gravidade || ""}
      />
      <AdminSectionView data={filteredData} />
    </div>
  );
}
