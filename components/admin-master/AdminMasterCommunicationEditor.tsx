"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">
              Admin Master
            </div>
            <h2 className="mt-2 break-words font-display text-2xl font-black text-zinc-950">
              {title}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
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
    <label className="block min-w-0">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-2 w-full min-w-0 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
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
    <label className="block min-w-0">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue || options[0]}
        className="mt-2 w-full min-w-0 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
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
    <label className="block min-w-0 md:col-span-2">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        className="mt-2 w-full min-w-0 resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function Toggle({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-3">
      <span className="text-sm font-black text-zinc-800">{label}</span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 shrink-0 accent-violet-700" />
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-2xl bg-violet-700 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

function FormActions({ submitLabel, onCancel }: { submitLabel: string; onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
      >
        Cancelar
      </button>
      <SubmitButton label={submitLabel} />
    </div>
  );
}

function EmptyEditorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/70 px-5 py-10 text-center lg:col-span-3">
      <div className="text-sm font-black text-zinc-800">{title}</div>
      <div className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-zinc-500">{description}</div>
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
          <h2 className="font-display text-2xl font-black text-zinc-950">Editor de campanhas</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">Crie ou edite campanhas com objetivo, público, período e filtros.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-800 sm:w-auto">
          <Megaphone size={16} /> Nova campanha
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {rows.length ? rows.map((row) => (
          <article key={row.id} className="min-w-0 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{row.tipo}</div>
            <h3 className="mt-2 break-words font-display text-xl font-black text-zinc-950">{row.nome}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{row.objetivo || "Sem objetivo definido"}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-600">{row.status}</span>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">{row.publicoTipo}</span>
            </div>
            <button type="button" onClick={() => setEditing(row)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800">
              <Pencil size={16} /> Editar campanha
            </button>
          </article>
        )) : <EmptyEditorState title="Nenhuma campanha cadastrada" description="Crie a primeira campanha para organizar público, período e objetivo sem deixar disparos soltos." />}
      </div>

      {editing ? (
        <Dialog title={current ? `Editar ${current.nome}` : "Nova campanha"} description="Campanha sem objetivo vira disparo solto. Defina intenção antes de ativar." onClose={() => setEditing(null)}>
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

export function AdminWhatsappPackagesEditor({ rows, salvarPacote }: { rows: AdminWhatsappPackageRow[]; salvarPacote: ServerAction }) {
  const [editing, setEditing] = useState<AdminWhatsappPackageRow | "new" | null>(null);
  const current = editing === "new" ? null : editing;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="font-display text-2xl font-black text-zinc-950">Pacotes de WhatsApp</h2><p className="mt-1 text-sm leading-6 text-zinc-500">Configure preço, créditos e status dos pacotes.</p></div>
        <button type="button" onClick={() => setEditing("new")} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-800 sm:w-auto"><PackagePlus size={16} /> Novo pacote</button>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {rows.length ? rows.map((row) => (
          <article key={row.id} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="break-words font-display text-xl font-black text-zinc-950">{row.nome}</h3>
            <div className="mt-3 text-2xl font-black text-zinc-950">{currency(row.preco)}</div>
            <p className="mt-1 text-sm text-zinc-500">{row.quantidadeCreditos} créditos</p>
            <button type="button" onClick={() => setEditing(row)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"><Pencil size={16} /> Editar pacote</button>
          </article>
        )) : <EmptyEditorState title="Nenhum pacote cadastrado" description="Cadastre um pacote quando quiser disponibilizar créditos de WhatsApp aos salões." />}
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

export function AdminWhatsappTemplatesEditor({ rows, salvarTemplate }: { rows: AdminWhatsappTemplateRow[]; salvarTemplate: ServerAction }) {
  const [editing, setEditing] = useState<AdminWhatsappTemplateRow | "new" | null>(null);
  const current = editing === "new" ? null : editing;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="font-display text-2xl font-black text-zinc-950">Templates de WhatsApp</h2><p className="mt-1 text-sm leading-6 text-zinc-500">Padronize mensagens aprovadas para atendimento e campanhas.</p></div>
        <button type="button" onClick={() => setEditing("new")} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-800 sm:w-auto"><MessageSquareText size={16} /> Novo template</button>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {rows.length ? rows.map((row) => (
          <article key={row.id} className="min-w-0 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{row.categoria}</div>
            <h3 className="mt-2 break-words font-display text-xl font-black text-zinc-950">{row.nome}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500">{row.conteudo}</p>
            <button type="button" onClick={() => setEditing(row)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"><Pencil size={16} /> Editar template</button>
          </article>
        )) : <EmptyEditorState title="Nenhum template cadastrado" description="Crie templates para manter mensagens de campanha e atendimento consistentes." />}
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
