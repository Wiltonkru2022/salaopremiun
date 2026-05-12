"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Save, SlidersHorizontal, X } from "lucide-react";

type PlanoEditorRow = {
  id: string;
  codigo: string;
  nome: string;
  subtitulo: string | null;
  valor_mensal: number;
  preco_anual: number | null;
  limite_usuarios: number;
  limite_profissionais: number;
  trial_dias: number | null;
  ideal_para: string | null;
  cta: string | null;
  destaque: boolean | null;
  ativo: boolean;
  ordem: number | null;
};

type RecursoEditorRow = {
  idPlano: string;
  planoCodigo: string;
  planoNome: string;
  recursoCodigo: string;
  habilitado: boolean;
  limiteNumero: number | null;
  observacao: string | null;
  existe: boolean;
};

export type AdminMasterPlanEditorData = {
  planos: PlanoEditorRow[];
  recursos: RecursoEditorRow[];
};

type ServerAction = (formData: FormData) => Promise<void>;

function brl(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function DialogShell({
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
  placeholder,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={3}
        className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function ToggleField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean | null;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-3">
      <span className="text-sm font-black text-zinc-800">{label}</span>
      <input
        name={name}
        type="checkbox"
        defaultChecked={Boolean(defaultChecked)}
        className="h-5 w-5 accent-zinc-950"
      />
    </label>
  );
}

function ActionForm({
  action,
  onDone,
  children,
  className,
}: {
  action: ServerAction;
  onDone: () => void;
  children: ReactNode;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await action(formData);
        router.refresh();
        onDone();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível salvar. Revise os dados e tente novamente."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 md:col-span-2">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
        {isPending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

export function AdminMasterPlanEditor({
  data,
  salvarPlano,
}: {
  data: AdminMasterPlanEditorData;
  salvarPlano: ServerAction;
}) {
  const [editing, setEditing] = useState<PlanoEditorRow | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-zinc-950">
            Edição real dos planos
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Altere preço, limites, trial, destaque, status e CTA com auditoria.
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {data.planos.map((plano) => (
          <article
            key={plano.id}
            className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
                  {plano.codigo}
                </div>
                <h3 className="mt-2 font-display text-xl font-black text-zinc-950">
                  {plano.nome}
                </h3>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  plano.ativo
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200"
                }`}
              >
                {plano.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-zinc-50 p-3">
                <div className="text-[11px] font-black uppercase text-zinc-400">
                  Mensal
                </div>
                <div className="mt-1 font-black">{brl(plano.valor_mensal)}</div>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-3">
                <div className="text-[11px] font-black uppercase text-zinc-400">
                  Trial
                </div>
                <div className="mt-1 font-black">{plano.trial_dias || 0} dias</div>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-3">
                <div className="text-[11px] font-black uppercase text-zinc-400">
                  Usuários
                </div>
                <div className="mt-1 font-black">{plano.limite_usuarios}</div>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-3">
                <div className="text-[11px] font-black uppercase text-zinc-400">
                  Equipe
                </div>
                <div className="mt-1 font-black">{plano.limite_profissionais}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing(plano)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              <Pencil size={16} />
              Editar plano
            </button>
          </article>
        ))}
      </div>

      {editing ? (
        <DialogShell
          title={`Editar ${editing.nome}`}
          description="Mudanças aqui afetam venda, assinatura, limite e promessa comercial."
          onClose={() => setEditing(null)}
        >
          <ActionForm
            action={salvarPlano}
            onDone={() => setEditing(null)}
            className="grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={editing.id} />
            <Field label="Nome" name="nome" defaultValue={editing.nome} />
            <Field label="Subtítulo" name="subtitulo" defaultValue={editing.subtitulo} />
            <Field
              label="Preço mensal"
              name="valor_mensal"
              type="number"
              step="0.01"
              defaultValue={editing.valor_mensal}
            />
            <Field
              label="Preço anual"
              name="preco_anual"
              type="number"
              step="0.01"
              defaultValue={editing.preco_anual}
            />
            <Field
              label="Limite de usuários"
              name="limite_usuarios"
              type="number"
              defaultValue={editing.limite_usuarios}
            />
            <Field
              label="Limite de profissionais"
              name="limite_profissionais"
              type="number"
              defaultValue={editing.limite_profissionais}
            />
            <Field
              label="Trial em dias"
              name="trial_dias"
              type="number"
              defaultValue={editing.trial_dias}
            />
            <Field label="Ordem" name="ordem" type="number" defaultValue={editing.ordem} />
            <TextAreaField
              label="Ideal para"
              name="ideal_para"
              defaultValue={editing.ideal_para}
            />
            <TextAreaField label="CTA" name="cta" defaultValue={editing.cta} />
            <ToggleField label="Plano destaque" name="destaque" defaultChecked={editing.destaque} />
            <ToggleField label="Plano ativo" name="ativo" defaultChecked={editing.ativo} />
            <div className="flex gap-2 md:col-span-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          </ActionForm>
        </DialogShell>
      ) : null}
    </section>
  );
}

export function AdminMasterResourceMatrixEditor({
  data,
  salvarRecurso,
}: {
  data: AdminMasterPlanEditorData;
  salvarRecurso: ServerAction;
}) {
  const [editing, setEditing] = useState<RecursoEditorRow | null>(null);
  const recursos = Array.from(new Set(data.recursos.map((item) => item.recursoCodigo))).sort();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-black text-zinc-950">
          Matriz editável de recursos
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          Clique em uma célula para liberar, bloquear, definir limite ou observação.
        </p>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
        <div className="scroll-premium overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="px-4 py-3.5 font-black">Recurso</th>
                {data.planos.map((plano) => (
                  <th key={plano.id} className="px-4 py-3.5 font-black">
                    {plano.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recursos.map((codigo) => (
                <tr key={codigo} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3.5 font-black text-zinc-950">{codigo}</td>
                  {data.planos.map((plano) => {
                    const cell = data.recursos.find(
                      (item) => item.idPlano === plano.id && item.recursoCodigo === codigo
                    );

                    if (!cell) return <td key={plano.id} className="px-4 py-3.5">-</td>;

                    return (
                      <td key={plano.id} className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => setEditing(cell)}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 transition ${
                            cell.habilitado
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                              : "bg-zinc-100 text-zinc-600 ring-zinc-200 hover:bg-zinc-200"
                          }`}
                        >
                          <SlidersHorizontal size={13} />
                          {cell.habilitado ? "Liberado" : "Bloqueado"}
                          {cell.limiteNumero ? ` · ${cell.limiteNumero}` : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <DialogShell
          title={`${editing.recursoCodigo} em ${editing.planoNome}`}
          description="Essa regra controla o que o salão pode acessar naquele plano."
          onClose={() => setEditing(null)}
        >
          <ActionForm
            action={salvarRecurso}
            onDone={() => setEditing(null)}
            className="grid gap-4"
          >
            <input type="hidden" name="id_plano" value={editing.idPlano} />
            <input type="hidden" name="recurso_codigo" value={editing.recursoCodigo} />
            <ToggleField
              label="Recurso liberado neste plano"
              name="habilitado"
              defaultChecked={editing.habilitado}
            />
            <Field
              label="Limite numérico"
              name="limite_numero"
              type="number"
              defaultValue={editing.limiteNumero}
              placeholder="Deixe vazio para ilimitado"
            />
            <TextAreaField
              label="Observação"
              name="observacao"
              defaultValue={editing.observacao}
              placeholder="Ex: liberado no Pro, suporte prioritário só no Premium"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          </ActionForm>
        </DialogShell>
      ) : null}
    </section>
  );
}
