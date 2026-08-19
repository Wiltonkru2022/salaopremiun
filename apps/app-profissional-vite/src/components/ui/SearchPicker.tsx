import { Plus, Search, UserPlus, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

export type SearchPickerOption = {
  value: string;
  label: string;
  description?: string | null;
  meta?: string | null;
};

type InlineCreateKind = "cliente" | "servico" | null;

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatPhone(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${ddd}) ${number}`;
  if (number.length <= 8) return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
  return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5, 9)}`;
}

function parseMoney(value: string) {
  const normalized = String(value || "").trim().replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function inferCreateKind(label?: string, placeholder?: string): InlineCreateKind {
  const text = `${label || ""} ${placeholder || ""}`.toLocaleLowerCase("pt-BR");
  if (text.includes("cliente")) return "cliente";
  if (text.includes("serviço") || text.includes("servico")) return "servico";
  return null;
}

export function SearchPicker({
  label,
  placeholder,
  options,
  value,
  onChange,
  emptyText = "Nada encontrado.",
  allowClear = true,
  hideInputWhenSelected = true,
  maxResults = 6,
  createKind
}: {
  label?: string;
  placeholder?: string;
  options: SearchPickerOption[];
  value: string;
  onChange: (value: string) => void;
  emptyText?: string;
  allowClear?: boolean;
  hideInputWhenSelected?: boolean;
  maxResults?: number;
  createKind?: Exclude<InlineCreateKind, null>;
}) {
  const [query, setQuery] = useState("");
  const [createdOptions, setCreatedOptions] = useState<SearchPickerOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const visibleLabel = label?.trim() || "";
  const inlineCreateKind: InlineCreateKind = createKind || inferCreateKind(label, placeholder);

  const allOptions = useMemo(() => {
    const merged = [...createdOptions, ...options];
    return Array.from(new Map(merged.map((item) => [item.value, item])).values());
  }, [createdOptions, options]);

  const selected = allOptions.find((item) => item.value === value) || null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return [];
    return allOptions
      .filter((item) => `${item.label} ${item.description || ""} ${item.meta || ""}`.toLocaleLowerCase("pt-BR").includes(normalized))
      .slice(0, maxResults);
  }, [allOptions, maxResults, query]);

  const showResults = query.trim().length > 0;

  function clearSelection() {
    onChange("");
    setQuery("");
  }

  function acceptCreated(option: SearchPickerOption) {
    setCreatedOptions((current) => [option, ...current.filter((item) => item.value !== option.value)]);
    onChange(option.value);
    setQuery("");
    setCreateOpen(false);
  }

  const createText = inlineCreateKind === "cliente" ? "Cadastrar nova cliente" : "Cadastrar novo serviço";

  return (
    <div className="grid gap-2">
      {visibleLabel ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-400">{visibleLabel}</span>
        </div>
      ) : null}

      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-[1.05rem] border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-3.5 py-3 text-zinc-950 shadow-[0_3px_10px_rgba(146,64,14,0.05)]">
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{selected.label}</div>
            {selected.description ? <div className="mt-0.5 truncate text-xs font-bold text-zinc-500">{selected.description}</div> : null}
          </div>
          {allowClear ? (
            <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200" onClick={clearSelection} aria-label="Alterar seleção">
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
            onFocus={(event) => window.setTimeout(() => event.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" }), 120)}
            placeholder={placeholder || (visibleLabel ? `Buscar ${visibleLabel.toLowerCase()}` : "Buscar")}
            className="h-12 w-full rounded-[1.05rem] border border-zinc-200 bg-white pl-11 pr-4 font-bold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100/70"
          />
        </div>
      ) : null}

      {showResults ? (
        <div className="overflow-hidden rounded-[1.05rem] border border-zinc-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.09)]">
          {filtered.length ? (
            <div className="max-h-44 overflow-auto">
              {filtered.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => { onChange(item.value); setQuery(""); }}
                  className="block w-full border-b border-zinc-100 px-4 py-3 text-left last:border-b-0 active:bg-zinc-50"
                >
                  <div className="truncate text-sm font-black text-zinc-950">{item.label}</div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs font-bold text-zinc-500">
                    <span className="truncate">{item.description || "Sem detalhe"}</span>
                    {item.meta ? <span className="shrink-0 text-zinc-500">{item.meta}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 pb-2 pt-4 text-center">
              <div className="text-sm font-black text-zinc-700">Nenhum resultado para “{query.trim()}”</div>
              <div className="mt-1 text-xs font-semibold text-zinc-500">Você pode cadastrar sem sair deste agendamento.</div>
            </div>
          )}

          {inlineCreateKind ? (
            <div className="border-t border-zinc-100 bg-amber-50/50 p-2.5">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-[0.9rem] border border-amber-200 bg-white px-4 py-3 text-sm font-black text-amber-900 shadow-sm active:scale-[0.99] active:bg-amber-50"
              >
                {inlineCreateKind === "cliente" ? <UserPlus size={18} /> : <Plus size={18} />}
                {createText}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 pb-4 text-center text-sm font-bold text-zinc-500">{emptyText}</div>
          ) : null}
        </div>
      ) : null}

      {createOpen && inlineCreateKind ? (
        <InlineCreateSheet
          kind={inlineCreateKind}
          initialName={query.trim()}
          onClose={() => setCreateOpen(false)}
          onCreated={acceptCreated}
        />
      ) : null}
    </div>
  );
}

function InlineCreateSheet({ kind, initialName, onClose, onCreated }: {
  kind: Exclude<InlineCreateKind, null>;
  initialName: string;
  onClose: () => void;
  onCreated: (option: SearchPickerOption) => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError(kind === "cliente" ? "Informe o nome da cliente." : "Informe o nome do serviço.");
    if (kind === "servico" && (!Number.isInteger(Number(duration)) || Number(duration) < 1)) return setError("Informe uma duração válida em minutos.");

    setLoading(true);
    try {
      const body = kind === "cliente"
        ? { action: "criar_cliente", nome: name.trim(), telefone: onlyDigits(phone), observacoes: notes.trim() }
        : { action: "criar_servico", nome: name.trim(), preco: parseMoney(price), duracaoMinutos: Number(duration), descricao: description.trim() };

      const response = await fetch("/api/app-profissional/mutacoes", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || !payload.id) throw new Error(String(payload.error || "Não foi possível cadastrar."));

      if (kind === "cliente") {
        onCreated({ value: String(payload.id), label: name.trim(), description: phone ? formatPhone(phone) : "Sem WhatsApp" });
      } else {
        const durationMinutes = Number(duration);
        onCreated({ value: String(payload.id), label: name.trim(), description: `${durationMinutes} min`, meta: formatMoney(parseMoney(price)) });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-zinc-950/60 p-2 backdrop-blur-md sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <section className="w-full max-w-lg overflow-hidden rounded-t-[1.75rem] border border-white/70 bg-white shadow-[0_-22px_70px_rgba(15,23,42,0.24)] sm:rounded-[1.75rem]">
        <div className="flex justify-center pt-2.5 sm:hidden"><span className="h-1 w-12 rounded-full bg-zinc-300" /></div>
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 pb-4 pt-4">
          <div className="min-w-0">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-amber-700">Cadastro rápido</div>
            <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950">{kind === "cliente" ? "Nova cliente" : "Novo serviço"}</h3>
            <p className="mt-1 text-sm font-semibold leading-5 text-zinc-500">Salve aqui e ele já ficará selecionado no agendamento.</p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-900"><X size={20} /></button>
        </header>

        <form onSubmit={submit} className="max-h-[72vh] overflow-auto px-5 py-4">
          <div className="grid gap-3.5">
            <QuickField label={kind === "cliente" ? "Nome da cliente" : "Nome do serviço"}>
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-[1rem] border border-zinc-200 px-4 font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100/70" />
            </QuickField>

            {kind === "cliente" ? (
              <>
                <QuickField label="WhatsApp">
                  <input inputMode="tel" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="(67) 99999-9999" className="h-12 w-full rounded-[1rem] border border-zinc-200 px-4 font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100/70" />
                </QuickField>
                <QuickField label="Observações">
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full resize-none rounded-[1rem] border border-zinc-200 px-4 py-3 font-semibold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100/70" />
                </QuickField>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <QuickField label="Preço">
                    <input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value.replace(/[^\d,.]/g, ""))} placeholder="0,00" className="h-12 w-full rounded-[1rem] border border-zinc-200 px-4 font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100/70" />
                  </QuickField>
                  <QuickField label="Duração (min)">
                    <input type="number" min={1} step={1} value={duration} onChange={(event) => setDuration(event.target.value)} className="h-12 w-full rounded-[1rem] border border-zinc-200 px-4 font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100/70" />
                  </QuickField>
                </div>
                <QuickField label="Descrição">
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full resize-none rounded-[1rem] border border-zinc-200 px-4 py-3 font-semibold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100/70" />
                </QuickField>
              </>
            )}

            {error ? <div className="rounded-[1rem] border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700">{error}</div> : null}
          </div>

          <div className="sticky bottom-0 -mx-5 mt-5 border-t border-zinc-100 bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
            <button disabled={loading} className="h-12 w-full rounded-[1rem] bg-zinc-950 px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(9,9,11,0.18)] disabled:opacity-60">
              {loading ? "Salvando..." : kind === "cliente" ? "Salvar e selecionar cliente" : "Salvar e selecionar serviço"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function QuickField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
