"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Search,
  X,
} from "lucide-react";
import AdminMasterRowActionButton from "@/components/admin-master/AdminMasterRowActionButton";
import type { AdminTableRow } from "@/lib/admin-master/data";

type Props = {
  rows: AdminTableRow[];
  columns: string[];
  emptyTitle: string;
  emptyDescription: string;
};

const FILTER_PRIORITY = [
  "status",
  "salao",
  "plano",
  "gravidade",
  "periodo",
  "modulo",
  "tipo",
  "categoria",
  "prioridade",
  "publico",
  "canal",
];

const PAGE_SIZES = [10, 25, 50, 100];

function isActionColumn(column: string) {
  return column === "acao" || column.endsWith("_acao");
}

function getActionField(column: string, suffix: "tipo" | "id") {
  return column === "acao" ? `acao_${suffix}` : `${column}_${suffix}`;
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function csvCell(value: unknown) {
  const text = String(value ?? "-").replace(/\r?\n/g, " ").replace(/"/g, '""');
  return `"${text}"`;
}

function htmlCell(value: unknown) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function columnLabel(column: string) {
  const text = column.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function AdminMasterDataTableClient({
  rows,
  columns,
  emptyTitle,
  emptyDescription,
}: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const filterColumns = useMemo(
    () =>
      columns
        .filter((column) => !isActionColumn(column))
        .filter(
          (column) =>
            FILTER_PRIORITY.includes(column) ||
            FILTER_PRIORITY.includes(column.split("_")[0] ?? "")
        )
        .slice(0, 5),
    [columns]
  );

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    for (const column of filterColumns) {
      options[column] = Array.from(
        new Set(rows.map((row) => String(row[column] ?? "-")).filter(Boolean))
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .slice(0, 80);
    }
    return options;
  }, [filterColumns, rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = normalize(search);
    return rows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        columns.some((column) => normalize(row[column]).includes(normalizedSearch));

      if (!matchesSearch) return false;

      return Object.entries(filters).every(([column, value]) => {
        if (!value) return true;
        return String(row[column] ?? "-") === value;
      });
    });
  }, [columns, filters, rows, search]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedRows = filteredRows.slice(start, start + pageSize);

  function updateFilter(column: string, value: string) {
    setFilters((current) => ({ ...current, [column]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({});
    setPage(1);
  }

  function exportCsv() {
    const exportColumns = columns.filter((column) => !isActionColumn(column));
    const header = exportColumns.map(columnLabel).map(csvCell).join(",");
    const body = filteredRows
      .map((row) => exportColumns.map((column) => csvCell(row[column])).join(","))
      .join("\n");
    const blob = new Blob([[header, body].filter(Boolean).join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-master-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function exportPdf() {
    const exportColumns = columns.filter((column) => !isActionColumn(column));
    const title = document.title || "AdminMaster";
    const generatedAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
    const tableRows = filteredRows.length
      ? filteredRows
          .map(
            (row) =>
              `<tr>${exportColumns
                .map((column) => `<td>${htmlCell(row[column])}</td>`)
                .join("")}</tr>`
          )
          .join("")
      : `<tr><td colspan="${exportColumns.length}">${htmlCell(emptyTitle)}</td></tr>`;
    const printFrame = document.createElement("iframe");

    printFrame.setAttribute("title", "Exportar tabela em PDF");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";

    printFrame.srcdoc = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${htmlCell(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #18181b; }
      header { margin-bottom: 18px; }
      h1 { margin: 0; font-size: 20px; }
      p { margin: 6px 0 0; color: #52525b; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #f4f4f5; color: #3f3f46; text-align: left; }
      th, td { border: 1px solid #e4e4e7; padding: 8px; vertical-align: top; word-break: break-word; }
      tr:nth-child(even) td { background: #fafafa; }
    </style>
  </head>
  <body>
    <header>
      <h1>${htmlCell(title)}</h1>
      <p>Exportado em ${htmlCell(generatedAt)}. Registros: ${filteredRows.length}.</p>
    </header>
    <table>
      <thead>
        <tr>${exportColumns.map((column) => `<th>${htmlCell(columnLabel(column))}</th>`).join("")}</tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`;

    document.body.appendChild(printFrame);
    printFrame.onload = () => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      window.setTimeout(() => printFrame.remove(), 1200);
    };
    setExportOpen(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/30">
      {columns.length ? (
        <div className="border-b border-zinc-100 p-3.5">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-zinc-500 transition focus-within:border-violet-300 focus-within:bg-white">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar"
                className="w-full bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>

            <div className="flex items-center gap-2">
              {filterColumns.length ? (
                <button
                  type="button"
                  onClick={() => setFiltersOpen((value) => !value)}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                    activeFilterCount
                      ? "border-violet-200 bg-violet-50 text-violet-700"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeFilterCount ? (
                    <span className="rounded-full bg-violet-700 px-1.5 py-0.5 text-[10px] font-black text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              ) : null}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((value) => !value)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Exportar
                  <ChevronDown className="h-4 w-4" />
                </button>
                {exportOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
                    <button
                      type="button"
                      onClick={exportCsv}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={exportPdf}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      <FileText className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {filtersOpen && filterColumns.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-2.5">
              {filterColumns.map((column) => (
                <select
                  key={column}
                  value={filters[column] ?? ""}
                  onChange={(event) => updateFilter(column, event.target.value)}
                  className="h-9 min-w-[150px] rounded-lg border border-zinc-200 bg-white px-2.5 text-sm font-medium text-zinc-700 outline-none focus:border-violet-300"
                  aria-label={`Filtrar por ${columnLabel(column)}`}
                >
                  <option value="">{columnLabel(column)}</option>
                  {(filterOptions[column] ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ))}

              {activeFilterCount ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 rounded-lg px-2.5 text-sm font-semibold text-zinc-500 transition hover:bg-white hover:text-zinc-900"
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="scroll-premium overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs text-zinc-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {columnLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pagedRows.length ? (
              pagedRows.map((row, index) => (
                <tr key={`${currentPage}-${index}`} className="transition hover:bg-zinc-50/70">
                  {columns.map((column) => (
                    <td
                      key={column}
                      title={String(row[column] ?? "-")}
                      className={`max-w-[320px] px-4 py-3 text-zinc-700 ${
                        column === "detalhe" || column === "titulo"
                          ? "whitespace-normal break-words leading-5"
                          : "truncate"
                      }`}
                    >
                      {isActionColumn(column) ? (
                        <AdminMasterRowActionButton
                          actionType={String(row[getActionField(column, "tipo")] || "")}
                          actionId={String(row[getActionField(column, "id")] || "")}
                          label={String(row[column] || "-")}
                        />
                      ) : (
                        String(row[column] ?? "-")
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="mx-auto max-w-md">
                    <div className="text-sm font-bold text-zinc-800">{emptyTitle}</div>
                    <div className="mt-1.5 text-sm leading-6 text-zinc-500">{emptyDescription}</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {columns.length ? (
        <div className="flex flex-col gap-2.5 border-t border-zinc-100 bg-white px-3.5 py-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-medium">
            {filteredRows.length ? `${start + 1}-${Math.min(start + pageSize, filteredRows.length)}` : "0"} de {filteredRows.length}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-600"
              aria-label="Quantidade por página"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} por página
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-14 text-center text-xs font-bold text-zinc-700">
              {currentPage}/{totalPages}
            </div>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
