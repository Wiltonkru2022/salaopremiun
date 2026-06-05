import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

export type SearchPickerOption = {
  value: string;
  label: string;
  description?: string | null;
  meta?: string | null;
};

export function SearchPicker({
  label,
  placeholder,
  options,
  value,
  onChange,
  emptyText = "Nada encontrado.",
  allowClear = true,
  hideInputWhenSelected = false,
  maxResults = 6
}: {
  label: string;
  placeholder?: string;
  options: SearchPickerOption[];
  value: string;
  onChange: (value: string) => void;
  emptyText?: string;
  allowClear?: boolean;
  hideInputWhenSelected?: boolean;
  maxResults?: number;
}) {
  const [query, setQuery] = useState("");
  const selected = options.find((item) => item.value === value) || null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return options
      .filter((item) => `${item.label} ${item.description || ""} ${item.meta || ""}`.toLowerCase().includes(normalized))
      .slice(0, maxResults);
  }, [maxResults, options, query]);

  const showResults = query.trim().length > 0;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
        {selected && allowClear ? (
          <button type="button" className="text-xs font-black text-zinc-500" onClick={() => { onChange(""); setQuery(""); }}>
            Trocar
          </button>
        ) : null}
      </div>

      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-950">
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{selected.label}</div>
            {selected.description ? <div className="mt-0.5 truncate text-xs font-bold text-zinc-500">{selected.description}</div> : null}
          </div>
          {allowClear ? (
            <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-zinc-500 shadow-sm" onClick={() => onChange("")} aria-label="Remover selecao">
              <X size={16} />
            </button>
          ) : null}
        </div>
      ) : null}

      {!(selected && hideInputWhenSelected) ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder || `Buscar ${label.toLowerCase()}`}
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 font-bold outline-none focus:border-zinc-950"
          />
        </div>
      ) : null}

      {showResults ? (
        <div className="max-h-48 overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {filtered.length ? filtered.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => { onChange(item.value); setQuery(""); }}
              className="block w-full border-b border-zinc-100 px-3 py-3 text-left last:border-b-0 active:bg-zinc-50"
            >
              <div className="truncate text-sm font-black text-zinc-950">{item.label}</div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs font-bold text-zinc-500">
                <span className="truncate">{item.description || "Sem detalhe"}</span>
                {item.meta ? <span className="shrink-0 text-zinc-400">{item.meta}</span> : null}
              </div>
            </button>
          )) : (
            <div className="px-3 py-4 text-center text-sm font-bold text-zinc-500">{emptyText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
