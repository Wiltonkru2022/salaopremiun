"use client";

import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

type SearchResponse = {
  ok?: boolean;
  results?: SearchResult[];
};

const TYPE_LABELS: Record<string, string> = {
  salao: "Salao",
  cobranca: "Cobranca",
  ticket: "Ticket",
  webhook: "Webhook",
  admin: "Admin",
  plano: "Plano",
};

export default function AdminMasterGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    if (deferredQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    startTransition(() => {
      void fetch(
        `/api/admin-master/search?q=${encodeURIComponent(deferredQuery)}`,
        {
          signal: controller.signal,
          cache: "no-store",
        }
      )
        .then(async (response) => {
          if (!response.ok) {
            return { ok: false, results: [] } satisfies SearchResponse;
          }

          return (await response.json()) as SearchResponse;
        })
        .then((payload) => {
          setResults(Array.isArray(payload.results) ? payload.results : []);
          setOpen(true);
        })
        .catch((error: unknown) => {
          if (
            error &&
            typeof error === "object" &&
            "name" in error &&
            error.name === "AbortError"
          ) {
            return;
          }

          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    });

    return () => {
      controller.abort();
    };
  }, [deferredQuery]);

  const emptyState = useMemo(() => {
    if (loading || deferredQuery.length < 2) return null;
    if (results.length > 0) return null;
    return "Nenhum resultado encontrado para essa busca.";
  }, [deferredQuery.length, loading, results.length]);

  return (
    <div className="relative w-full max-w-2xl">
      <label className="flex items-center gap-3 rounded-[24px] border border-zinc-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-zinc-950 focus-within:shadow-md">
        <Search size={18} className="text-zinc-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 140);
          }}
          placeholder="Buscar salao, cobranca, ticket, webhook, admin ou plano"
          className="w-full bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        <span className="hidden rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 md:inline-flex">
          Global
        </span>
      </label>

      {open && (loading || results.length > 0 || emptyState) ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50 overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
          {loading ? (
            <div className="flex items-center gap-3 px-4 py-4 text-sm font-medium text-zinc-500">
              <Sparkles size={16} className="text-amber-500" />
              Buscando no AdminMaster...
            </div>
          ) : null}

          {!loading && results.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto p-2">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="flex items-start gap-3 rounded-2xl px-3 py-3 transition hover:bg-zinc-50"
                >
                  <span className="mt-0.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                    {TYPE_LABELS[result.type] || result.type}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-zinc-950">
                      {result.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      {result.subtitle}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {!loading && emptyState ? (
            <div className="px-4 py-5 text-sm text-zinc-500">{emptyState}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
