"use client";

import { useState, type ReactNode } from "react";
import { MessageSquareText, Megaphone, PackagePlus, Pencil, X } from "lucide-react";
import type {
  AdminCampaignEditorRow,
  AdminWhatsappPackageRow,
  AdminWhatsappTemplateRow,
} from "@/lib/admin-master/communication-editor";

type ServerAction = (formData: FormData) => Promise<void>;

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Dialog({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-zinc-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-amber-600">
              AdminMaster
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
              {title}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-950 hover:text-white"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue || options[0]}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows = 4,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function Toggle({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3">
      <span className="text-sm font-black text-zinc-800">{label}</span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 accent-zinc-950" />
    </label>
  );
}

function FormActions({ submitLabel, onCancel }: { submitLabel: string; onCancel: () => void }) {
  return (
    <div className="flex gap-2 md:col-span-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        className="flex-1 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
      >
        {submitLabel}
      </button>
    </div>
  );
}

export function AdminCampaignEditor({
  rows,
  salvarCampanha,
}: {
  rows: AdminCampaignEditorRow[];
  salvarCampanha: ServerAction;
}) {
  const [editing, setEditing] = useState<AdminCampaignEditorRow | "new" | null>(null);
  const current = editing === "new" ? null : editing;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-zinc-950">
            Editor de campanhas
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Crie ou edite campanhas com objetivo, público, período e filtros.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
        >
          <Megaphone size={16} />
          Nova campanha
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">{row.tipo}</div>
            <h3 className="mt-2 font-display text-xl font-black text-zinc-950">{row.nome}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{row.objetivo || "Sem objetivo definido"}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-600">{row.status}</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{row.publicoTipo}</span>
            </div>
            <button
              type="button"
              onClick={() => setEditing(row)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800 transition hover:bg-zinc-950 hover:text-white"
            >
              <Pencil size={16} />
              Editar campanha
            </button>
          </article>
        ))}
      </div>

      {editing ? (
        <Dialog
          title={current ? `Editar ${current.nome}` : "Nova campanha"}
          description="Campanha sem objetivo vira disparo solto. Defina intenção antes de ativar."
          onClose={() => setEditing(null)}
        >
          <form action={salvarCampanha} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={current?.id || ""} />
            <Field label="Nome" name="nome" defaultValue={current?.nome} required />
            <SelectField label="Status" name="status" defaultValue={current?.status} options={["rascunho", "ativa", "pausada", "encerrada"]} />
            <SelectField label="Tipo" name="tipo" defaultValue={current?.tipo} options={["marketing", "retencao", "trial", "recuperacao", "aviso"]} />
            <SelectField label="Público" name="publico_tipo" defaultValue={current?.publicoTipo} options={["todos", "saloes", "clientes", "profissionais", "trial", "inadimplentes"]} />
            <Field label="Início" name="inicio_em" type="datetime-local" defaultValue={current?.inicioEm} />
            <Field label="Fim" name="fim_em" type="datetime-local" defaultValue={current?.fimEm} />
            <TextArea label="Objetivo" name="objetivo" defaultValue={current?.objetivo} />
            <TextArea label="Filtros JSON" name="filtros_json" defaultValue={current?.filtrosJson || "{}"} rows={5} />
            <FormActions submitLabel="Salvar campanha" onCancel={() => setEditing(null)} />
          </form>
        </Dialog>
      ) : null}
    </section>
  );
}

export function AdminWhatsappPackagesEditor({
  rows,
  salvarPacote,
}: {
  rows: AdminWhatsappPackageRow[];
  salvarPacote: ServerAction;
}) {
  const [editing, setEditing] = useState<AdminWhatsappPackageRow | "new" | null>(null);
  const current = editing === "new" ? null : editing;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-zinc-950">Pacotes de WhatsApp</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">Configure preço, créditos e status dos pacotes.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800">
          <PackagePlus size={16} />
          Novo pacote
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="font-display text-xl font-black text-zinc-950">{row.nome}</h3>
            <div className="mt-3 text-2xl font-black text-zinc-950">{currency(row.preco)}</div>
            <p className="mt-1 text-sm text-zinc-500">{row.quantidadeCreditos} créditos</p>
            <button type="button" onClick={() => setEditing(row)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800 transition hover:bg-zinc-950 hover:text-white">
              <Pencil size={16} />
              Editar pacote
            </button>
          </article>
        ))}
      </div>
      {editing ? (
        <Dialog title={current ? `Editar ${current.nome}` : "Novo pacote"} description="Pacote define cobrança e saldo de créditos dos salões." onClose={() => setEditing(null)}>
          <form action={salvarPacote} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={current?.id || ""} />
            <Field label="Nome" name="nome" defaultValue={current?.nome} required />
            <Field label="Preço" name="preco" type="number" defaultValue={current?.preco} required />
            <Field label="Créditos" name="quantidade_creditos" type="number" defaultValue={current?.quantidadeCreditos} required />
            <Toggle label="Pacote ativo" name="ativo" defaultChecked={current?.ativo ?? true} />
            <FormActions submitLabel="Salvar pacote" onCancel={() => setEditing(null)} />
          </form>
        </Dialog>
      ) : null}
    </section>
  );
}

export function AdminWhatsappTemplatesEditor({
  rows,
  salvarTemplate,
}: {
  rows: AdminWhatsappTemplateRow[];
  salvarTemplate: ServerAction;
}) {
  const [editing, setEditing] = useState<AdminWhatsappTemplateRow | "new" | null>(null);
  const current = editing === "new" ? null : editing;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-zinc-950">Templates de WhatsApp</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">Padronize mensagens aprovadas para atendimento e campanhas.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800">
          <MessageSquareText size={16} />
          Novo template
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">{row.categoria}</div>
            <h3 className="mt-2 font-display text-xl font-black text-zinc-950">{row.nome}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500">{row.conteudo}</p>
            <button type="button" onClick={() => setEditing(row)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800 transition hover:bg-zinc-950 hover:text-white">
              <Pencil size={16} />
              Editar template
            </button>
          </article>
        ))}
      </div>
      {editing ? (
        <Dialog title={current ? `Editar ${current.nome}` : "Novo template"} description="Use texto claro e sem promessa que o sistema não consiga cumprir." onClose={() => setEditing(null)}>
          <form action={salvarTemplate} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={current?.id || ""} />
            <Field label="Nome" name="nome" defaultValue={current?.nome} required />
            <SelectField label="Categoria" name="categoria" defaultValue={current?.categoria} options={["marketing", "agenda", "financeiro", "suporte", "seguranca"]} />
            <TextArea label="Conteúdo" name="conteudo" defaultValue={current?.conteudo} rows={7} required />
            <Toggle label="Template ativo" name="ativo" defaultChecked={current?.ativo ?? true} />
            <FormActions submitLabel="Salvar template" onCancel={() => setEditing(null)} />
          </form>
        </Dialog>
      ) : null}
    </section>
  );
}
