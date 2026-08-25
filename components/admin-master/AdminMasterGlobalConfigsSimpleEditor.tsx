"use client";

import { useMemo, useState } from "react";
import { Plus, Settings2, X } from "lucide-react";
import type { AdminGlobalConfigEditorRow, AdminMasterGovernanceEditorData } from "@/components/admin-master/AdminMasterGovernanceEditor";

type ServerAction = (formData: FormData) => Promise<void>;

type Primitive = string | number | boolean | null;

function parseObject(text: string): Record<string, Primitive> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed as Record<string, unknown>);
    if (entries.some(([, value]) => value !== null && !["string", "number", "boolean"].includes(typeof value))) return null;
    return Object.fromEntries(entries) as Record<string, Primitive>;
  } catch {
    return null;
  }
}

function formatValue(value: Primitive) {
  if (typeof value === "boolean") return value ? "Ativo" : "Inativo";
  if (value === null || value === "") return "Não definido";
  return String(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Campo_Grande" }).format(date);
}

function ConfigDialog({
  config,
  salvar,
  onClose,
}: {
  config: AdminGlobalConfigEditorRow | null;
  salvar: ServerAction;
  onClose: () => void;
}) {
  const initialRaw = config?.valorJsonText || "{\n  \"ativo\": true\n}";
  const [raw, setRaw] = useState(initialRaw);
  const simpleObject = useMemo(() => parseObject(raw), [raw]);

  function updateSimple(key: string, next: Primitive) {
    if (!simpleObject) return;
    setRaw(JSON.stringify({ ...simpleObject, [key]: next }, null, 2));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Configuração</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{config ? config.chave : "Nova configuração"}</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">Edite os valores visuais quando possível. O JSON completo fica apenas na área avançada.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50" aria-label="Fechar"><X size={18} /></button>
        </div>

        <form action={salvar} className="mt-5 grid gap-4" onSubmit={() => window.setTimeout(onClose, 100)}>
          <input type="hidden" name="id" value={config?.id || ""} />
          <input type="hidden" name="valor_json" value={raw} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-zinc-700">Chave
              <input name="chave" required defaultValue={config?.chave || ""} className="h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-zinc-700">Descrição
              <input name="descricao" defaultValue={config?.descricao || ""} className="h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
            </label>
          </div>

          {simpleObject && Object.keys(simpleObject).length ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-black text-zinc-900">Valores</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {Object.entries(simpleObject).map(([key, value]) => (
                  <label key={key} className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                    {key.replace(/_/g, " ")}
                    {typeof value === "boolean" ? (
                      <select value={value ? "true" : "false"} onChange={(event) => updateSimple(key, event.target.value === "true")} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-zinc-900 outline-none focus:border-violet-300">
                        <option value="true">Ativo</option><option value="false">Inativo</option>
                      </select>
                    ) : typeof value === "number" ? (
                      <input type="number" value={value} onChange={(event) => updateSimple(key, Number(event.target.value))} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-zinc-900 outline-none focus:border-violet-300" />
                    ) : (
                      <input value={value ?? ""} onChange={(event) => updateSimple(key, event.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-zinc-900 outline-none focus:border-violet-300" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Esta configuração tem estrutura avançada. Use “Detalhes técnicos” abaixo para editar com cuidado.</div>
          )}

          <details className="rounded-2xl border border-zinc-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-zinc-500">Detalhes técnicos · JSON</summary>
            <div className="border-t border-zinc-100 p-4">
              <textarea value={raw} onChange={(event) => setRaw(event.target.value)} rows={10} className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-950 p-3 font-mono text-xs text-zinc-100 outline-none focus:border-violet-400" />
            </div>
          </details>

          <button type="submit" className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800">Salvar configuração</button>
        </form>
      </div>
    </div>
  );
}

export default function AdminMasterGlobalConfigsSimpleEditor({
  data,
  salvarConfiguracao,
}: {
  data: AdminMasterGovernanceEditorData;
  salvarConfiguracao: ServerAction;
}) {
  const [editing, setEditing] = useState<AdminGlobalConfigEditorRow | "nova" | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-950">Preferências globais</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">Valores principais aparecem de forma legível. Estruturas técnicas ficam recolhidas.</p>
        </div>
        <button type="button" onClick={() => setEditing("nova")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white hover:bg-zinc-800"><Plus size={16} />Nova configuração</button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {data.configuracoes.map((config) => {
          const values = parseObject(config.valorJsonText);
          return (
            <article key={config.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Plataforma</div><h3 className="mt-1.5 text-lg font-black text-zinc-950">{config.chave.replace(/_/g, " ")}</h3></div>
                <Settings2 size={19} className="text-zinc-400" />
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{config.descricao || "Sem descrição operacional."}</p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {values && Object.keys(values).length ? Object.entries(values).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-zinc-50 px-3 py-2.5"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{key.replace(/_/g, " ")}</div><div className="mt-1 truncate text-sm font-black text-zinc-800">{formatValue(value)}</div></div>
                )) : <div className="sm:col-span-2 rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-500">Estrutura avançada — abra para editar.</div>}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-zinc-400"><span>Atualizado {formatDate(config.atualizadoEm)}</span><button type="button" onClick={() => setEditing(config)} className="rounded-lg border border-zinc-200 px-3 py-2 font-bold text-zinc-700 hover:bg-zinc-50">Editar</button></div>
            </article>
          );
        })}
      </div>

      {editing ? <ConfigDialog config={editing === "nova" ? null : editing} salvar={salvarConfiguracao} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}
