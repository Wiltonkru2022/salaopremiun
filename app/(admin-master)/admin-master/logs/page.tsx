import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
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
  return Object.values(row).map(normalize).join(" ").includes(query);
}

function filterLogs(
  data: AdminSectionData,
  params: { busca?: string; modulo?: string; gravidade?: string }
) {
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
    title: "Diagnóstico técnico",
    description: "Logs e auditoria para investigação avançada. Use esta área quando Saúde ou Alertas indicarem um problema.",
    rows,
    diagnostics: [
      ...(data.diagnostics || []),
      {
        label: "Filtro atual",
        value: `${rows.length}/${data.rows.length}`,
        detail:
          busca || modulo || gravidade
            ? "Mostrando apenas os registros que combinam com os filtros informados."
            : "Sem filtro aplicado. Use busca, módulo ou gravidade para reduzir a investigação.",
        tone: busca || modulo || gravidade ? "blue" : "green",
      },
    ],
  } satisfies AdminSectionData;
}

function uniqueOptions(rows: AdminTableRow[], key: string) {
  return Array.from(
    new Set(rows.map((row) => String(row[key] || "").trim()).filter((value) => value && value !== "-"))
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
    <details className="rounded-2xl border border-zinc-200 bg-white shadow-sm" open={Boolean(busca || modulo || gravidade)}>
      <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-bold text-zinc-700">
        Filtros avançados de diagnóstico
      </summary>
      <form className="grid gap-3 border-t border-zinc-100 p-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto]">
        <label className="grid gap-1.5 text-xs font-bold text-zinc-500">
          Busca
          <input
            name="busca"
            defaultValue={busca}
            placeholder="ID, salão, rota, erro..."
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-violet-300"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-zinc-500">
          Módulo
          <select name="modulo" defaultValue={modulo} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-violet-300">
            <option value="">Todos</option>
            {modulos.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-zinc-500">
          Gravidade
          <select name="gravidade" defaultValue={gravidade} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-violet-300">
            <option value="">Todas</option>
            {gravidades.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <button type="submit" className="h-10 self-end rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white hover:bg-zinc-800">Filtrar</button>
        <a href="/admin-master/logs" className="flex h-10 items-center justify-center self-end rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Limpar</a>
      </form>
    </details>
  );
}

export default async function AdminMasterLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ busca?: string; modulo?: string; gravidade?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const data = await getAdminMasterSection("logs");
  const filteredData = filterLogs(data, params);

  return (
    <div className="space-y-5">
      <LogsFilterBar
        rows={data.rows}
        busca={params.busca || ""}
        modulo={params.modulo || ""}
        gravidade={params.gravidade || ""}
      />
      <AdminMasterSectionSimple data={filteredData} />
    </div>
  );
}
