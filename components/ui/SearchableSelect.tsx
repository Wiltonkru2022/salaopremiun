"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import clsx from "clsx";

export type SearchableOption = {
  value: string;
  label: string;
  description?: string | null;
};

type Props = {
  label?: string;
  placeholder?: string;
  emptyText?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void | Promise<void>;
  disabled?: boolean;
};

export default function SearchableSelect({
  label,
  placeholder = "Digite para buscar...",
  emptyText = "Nenhum resultado encontrado.",
  options,
  value,
  onChange,
  disabled = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery(selectedOption?.label || "");
    }
  }, [open, selectedOption]);

  useEffect(() => {
    setQuery(selectedOption?.label || "");
  }, [selectedOption?.label]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selectedOption?.label || "");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return options;

    return options.filter((option) => {
      const labelMatch = option.label.toLowerCase().includes(q);
      const descMatch = String(option.description || "")
        .toLowerCase()
        .includes(q);

      return labelMatch || descMatch;
    });
  }, [options, query]);

  const bestMatch = useMemo(() => {
    if (filteredOptions.length === 0) {
      return null;
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return filteredOptions[0];
    }

    return (
      filteredOptions.find(
        (option) => option.label.trim().toLowerCase() === normalizedQuery
      ) || filteredOptions[0]
    );
  }, [filteredOptions, query]);

  function handleOpen() {
    if (disabled) return;
    setOpen(true);

    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  async function handleSelect(optionValue: string) {
    await onChange(optionValue);
    setOpen(false);

    const option = options.find((item) => item.value === optionValue);
    setQuery(option?.label || "");
  }

  function handleClear() {
    void onChange("");
    setQuery("");
    setOpen(true);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  return (
    <div ref={containerRef} className="relative">
      {label ? (
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
          {label}
        </label>
      ) : null}

      <div
        className={clsx(
          "flex min-h-[46px] items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 transition",
          "focus-within:border-zinc-900 focus-within:bg-white",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <Search size={15} className="shrink-0 text-zinc-400" />

        <input
          ref={inputRef}
          value={open ? query : selectedOption?.label || query}
          onFocus={handleOpen}
          onClick={handleOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (bestMatch) {
                void handleSelect(bestMatch.value);
              }
              return;
            }

            if (!open) return;

            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setQuery(selectedOption?.label || "");
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        />

        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            title="Limpar"
          >
            <X size={14} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => (open ? setOpen(false) : handleOpen())}
          className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          tabIndex={-1}
        >
          <ChevronDown size={15} />
        </button>
      </div>

      {open ? (
        <div className="absolute z-[200] mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl">
          {filteredOptions.length > 0 ? (
            <div className="space-y-1">
              {filteredOptions.map((option) => {
                const selected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void handleSelect(option.value)}
                    className={clsx(
                      "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      selected ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {option.label}
                      </div>

                      {option.description ? (
                        <div
                          className={clsx(
                            "mt-0.5 truncate text-xs",
                            selected ? "text-zinc-300" : "text-zinc-500"
                          )}
                        >
                          {option.description}
                        </div>
                      ) : null}
                    </div>

                    {selected ? <Check size={15} className="shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-zinc-500">{emptyText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
