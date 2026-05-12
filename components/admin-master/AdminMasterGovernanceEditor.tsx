"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Flag,
  KeyRound,
  LoaderCircle,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  X,
} from "lucide-react";

export type AdminFeatureFlagEditorRow = {
  id: string;
  nome: string;
  descricao: string | null;
  statusGlobal: boolean;
  tipoLiberacao: string;
  planos: string[];
  dataInicio: string | null;
  dataFim: string | null;
  criadoEm: string;
  saloes: Array<{
    id: string;
    idSalao: string;
    ativo: boolean;
    criadoEm: string;
  }>;
};

export type AdminUserEditorRow = {
  id: string;
  authUserId: string | null;
  nome: string;
  email: string;
  perfil: string;
  status: string;
  ultimoAcessoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  permissoes: Record<string, boolean>;
};

export type AdminGlobalConfigEditorRow = {
  id: string;
  chave: string;
  descricao: string | null;
  valorJsonText: string;
  atualizadoPor: string | null;
  atualizadoEm: string;
};

export type AdminMasterGovernanceEditorData = {
  planos: Array<{ codigo: string; nome: string }>;
  recursosPadrao: string[];
  saloes: Array<{
    id: string;
    nome: string;
    cidade: string | null;
    plano: string | null;
    status: string | null;
  }>;
  featureFlags: AdminFeatureFlagEditorRow[];
  usuarios: AdminUserEditorRow[];
  permissionKeys: string[];
  configuracoes: AdminGlobalConfigEditorRow[];
};

type ServerAction = (formData: FormData) => Promise<void>;

function friendlyPermissionName(key: string) {
  return key
    .replace(/_/g, " ")
    .replace("ver", "visualizar")
    .replace("editar", "editar")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
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
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-zinc-200 bg-white p-5 shadow-2xl">
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
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
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
        placeholder={placeholder}
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

function TextAreaField({
  label,
  name,
  defaultValue,
  rows = 3,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
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
        rows={rows}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-mono text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
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
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
        {isPending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

export function AdminMasterFeatureFlagsEditor({
  data,
  salvarFeatureFlag,
  salvarLiberacaoSalao,
}: {
  data: AdminMasterGovernanceEditorData;
  salvarFeatureFlag: ServerAction;
  salvarLiberacaoSalao: ServerAction;
}) {
  const [editing, setEditing] = useState<AdminFeatureFlagEditorRow | "nova" | null>(null);
  const [releaseEditing, setReleaseEditing] = useState<AdminFeatureFlagEditorRow | null>(null);
  const current = editing === "nova" ? null : editing;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-zinc-950">
            Feature flags editáveis
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Controle liberação global, por plano, por salão e janela de teste com auditoria.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("nova")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
        >
          <Plus size={16} />
          Nova flag
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {data.featureFlags.map((flag) => (
          <article key={flag.id} className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                  {flag.tipoLiberacao}
                </div>
                <h3 className="mt-2 font-display text-xl font-black text-zinc-950">
                  {flag.nome}
                </h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${flag.statusGlobal ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200"}`}>
                {flag.statusGlobal ? "Global" : "Controlada"}
              </span>
            </div>
            <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-500">
              {flag.descricao || "Sem descrição pública para suporte."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-zinc-50 p-3">
                <div className="text-[11px] font-black uppercase text-zinc-400">Planos</div>
                <div className="mt-1 truncate font-black">{flag.planos.join(", ") || "-"}</div>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-3">
                <div className="text-[11px] font-black uppercase text-zinc-400">Salões</div>
                <div className="mt-1 font-black">{flag.saloes.filter((item) => item.ativo).length}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditing(flag)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
              >
                <Flag size={16} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setReleaseEditing(flag)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800 transition hover:bg-zinc-50"
              >
                <SlidersHorizontal size={16} />
                Salão
              </button>
            </div>
          </article>
        ))}
      </div>

      {editing ? (
        <DialogShell
          title={current ? `Editar ${current.nome}` : "Nova feature flag"}
          description="Use flag global com cuidado. Para teste, prefira liberação por plano ou por salão."
          onClose={() => setEditing(null)}
        >
          <ActionForm
            action={salvarFeatureFlag}
            onDone={() => setEditing(null)}
            className="grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={current?.id || ""} />
            <Field label="Nome" name="nome" defaultValue={current?.nome} required />
            <SelectField
              label="Tipo de liberação"
              name="tipo_liberacao"
              defaultValue={current?.tipoLiberacao}
              options={["plano", "salao", "global", "janela"]}
            />
            <Field label="Início" name="data_inicio" type="datetime-local" defaultValue={current?.dataInicio?.slice(0, 16)} />
            <Field label="Fim" name="data_fim" type="datetime-local" defaultValue={current?.dataFim?.slice(0, 16)} />
            <TextAreaField label="Descrição" name="descricao" defaultValue={current?.descricao} />
            <label className="block md:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Planos liberados
              </span>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {data.planos.map((plano) => (
                  <label key={plano.codigo} className="flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800">
                    <input
                      type="checkbox"
                      name="planos"
                      value={plano.codigo}
                      defaultChecked={current?.planos.includes(plano.codigo)}
                      className="h-4 w-4 accent-zinc-950"
                    />
                    {plano.nome}
                  </label>
                ))}
              </div>
            </label>
            <div className="md:col-span-2">
              <ToggleField label="Liberar globalmente para todos os salões" name="status_global" defaultChecked={current?.statusGlobal} />
            </div>
          </ActionForm>
        </DialogShell>
      ) : null}

      {releaseEditing ? (
        <DialogShell
          title={`Liberar salão para ${releaseEditing.nome}`}
          description="Use para piloto controlado, beta privado ou exceção temporária de suporte."
          onClose={() => setReleaseEditing(null)}
        >
          <ActionForm
            action={salvarLiberacaoSalao}
            onDone={() => setReleaseEditing(null)}
            className="grid gap-4"
          >
            <input type="hidden" name="id_feature_flag" value={releaseEditing.id} />
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Salão
              </span>
              <select
                name="id_salao"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
              >
                {data.saloes.map((salao) => (
                  <option key={salao.id} value={salao.id}>
                    {salao.nome} {salao.cidade ? `- ${salao.cidade}` : ""} {salao.plano ? `(${salao.plano})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
              {data.saloes.slice(0, 8).map((salao) => (
                <div key={salao.id} className="flex items-center justify-between gap-3 border-b border-zinc-200 py-2 last:border-0">
                  <span className="font-bold text-zinc-900">{salao.nome}</span>
                  <span className="text-xs font-black uppercase text-zinc-400">{salao.plano || "-"}</span>
                </div>
              ))}
              <p className="mt-3 text-xs font-semibold text-zinc-500">
                Cole ou selecione o ID do salão no campo acima. A lista mostra os primeiros salões como referência.
              </p>
            </div>
            <ToggleField label="Liberado para este salão" name="ativo" defaultChecked />
          </ActionForm>
        </DialogShell>
      ) : null}
    </section>
  );
}

export function AdminMasterUsersEditor({
  data,
  salvarUsuario,
}: {
  data: AdminMasterGovernanceEditorData;
  salvarUsuario: ServerAction;
}) {
  const [editing, setEditing] = useState<AdminUserEditorRow | "novo" | null>(null);
  const current = editing === "novo" ? null : editing;
  const permissionGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    data.permissionKeys.forEach((key) => {
      const group = key.split("_")[0] || "geral";
      groups[group] = [...(groups[group] || []), key];
    });
    return groups;
  }, [data.permissionKeys]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-zinc-950">
            Usuários e permissões
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Cadastre admins, suspenda acesso e ajuste permissões sensíveis sem mexer no banco.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("novo")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
        >
          <Plus size={16} />
          Novo admin
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {data.usuarios.map((usuario) => {
          const total = Object.values(usuario.permissoes).filter(Boolean).length;
          return (
            <article key={usuario.id} className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-black text-zinc-950">
                    {usuario.nome}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">{usuario.email}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${usuario.status === "ativo" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200"}`}>
                  {usuario.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <div className="text-[11px] font-black uppercase text-zinc-400">Perfil</div>
                  <div className="mt-1 font-black">{usuario.perfil}</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <div className="text-[11px] font-black uppercase text-zinc-400">Permissões</div>
                  <div className="mt-1 font-black">{total}</div>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-zinc-500">
                Último acesso: {formatDateTime(usuario.ultimoAcessoEm)}
              </p>
              <button
                type="button"
                onClick={() => setEditing(usuario)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
              >
                <UserCog size={16} />
                Editar permissões
              </button>
            </article>
          );
        })}
      </div>

      {editing ? (
        <DialogShell
          title={current ? `Editar ${current.nome}` : "Novo admin interno"}
          description="O e-mail cadastrado aqui ganha acesso ao Admin Master quando fizer login. Permissões ficam auditadas."
          onClose={() => setEditing(null)}
        >
          <ActionForm
            action={salvarUsuario}
            onDone={() => setEditing(null)}
            className="grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={current?.id || ""} />
            <Field label="Nome" name="nome" defaultValue={current?.nome} required />
            <Field label="E-mail" name="email" type="email" defaultValue={current?.email} required />
            <SelectField
              label="Perfil"
              name="perfil"
              defaultValue={current?.perfil}
              options={["owner", "financeiro", "suporte", "operacao", "produto", "marketing", "analista"]}
            />
            <SelectField
              label="Status"
              name="status"
              defaultValue={current?.status}
              options={["ativo", "suspenso", "inativo"]}
            />
            <div className="md:col-span-2">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Permissões
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {Object.entries(permissionGroups).map(([group, keys]) => (
                  <div key={group} className="rounded-2xl border border-zinc-200 p-3">
                    <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                      {group}
                    </div>
                    <div className="grid gap-2">
                      {keys.map((key) => (
                        <label key={key} className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                          <input
                            type="checkbox"
                            name="permissoes"
                            value={key}
                            defaultChecked={current?.permissoes[key]}
                            className="h-4 w-4 accent-zinc-950"
                          />
                          {friendlyPermissionName(key)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ActionForm>
        </DialogShell>
      ) : null}
    </section>
  );
}

export function AdminMasterGlobalConfigsEditor({
  data,
  salvarConfiguracao,
}: {
  data: AdminMasterGovernanceEditorData;
  salvarConfiguracao: ServerAction;
}) {
  const [editing, setEditing] = useState<AdminGlobalConfigEditorRow | "nova" | null>(null);
  const current = editing === "nova" ? null : editing;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-zinc-950">
            Configurações globais editáveis
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Edite JSON global com histórico. Use para manutenção, avisos, templates e chaves operacionais.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("nova")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
        >
          <Plus size={16} />
          Nova configuração
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {data.configuracoes.map((config) => (
          <article key={config.id} className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                  Config global
                </div>
                <h3 className="mt-2 font-display text-xl font-black text-zinc-950">
                  {config.chave}
                </h3>
              </div>
              <Settings2 className="text-zinc-400" size={20} />
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              {config.descricao || "Sem descrição operacional."}
            </p>
            <pre className="mt-4 max-h-32 overflow-auto rounded-2xl bg-zinc-950 p-3 text-xs font-semibold text-zinc-100">
              {config.valorJsonText}
            </pre>
            <p className="mt-3 text-xs font-semibold text-zinc-500">
              Atualizado em {formatDateTime(config.atualizadoEm)}
            </p>
            <button
              type="button"
              onClick={() => setEditing(config)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              <KeyRound size={16} />
              Editar JSON
            </button>
          </article>
        ))}
      </div>

      {editing ? (
        <DialogShell
          title={current ? `Editar ${current.chave}` : "Nova configuração global"}
          description="JSON inválido não será salvo. O valor anterior fica no histórico para auditoria."
          onClose={() => setEditing(null)}
        >
          <ActionForm
            action={salvarConfiguracao}
            onDone={() => setEditing(null)}
            className="grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={current?.id || ""} />
            <Field label="Chave" name="chave" defaultValue={current?.chave} required />
            <Field label="Descrição" name="descricao" defaultValue={current?.descricao} />
            <TextAreaField
              label="Valor JSON"
              name="valor_json"
              defaultValue={current?.valorJsonText || "{\n  \"ativo\": true\n}"}
              rows={10}
            />
          </ActionForm>
        </DialogShell>
      ) : null}
    </section>
  );
}

export function AdminMasterTrialCoherencePanel({
  data,
}: {
  data: AdminMasterGovernanceEditorData;
}) {
  const premium = data.planos.find((plano) => plano.codigo === "premium");

  return (
    <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck size={14} />
            Trial coerente
          </div>
          <h2 className="mt-3 font-display text-2xl font-black">
            Teste grátis libera tudo por 15 dias
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-emerald-800">
            O motor de acesso usa o plano efetivo {premium?.nome || "Premium"} enquanto a assinatura está em
            teste grátis e não vencida. Assim o salão novo consegue testar app cliente, app profissional,
            caixa, agenda, comissões e relatórios antes de escolher um plano pago.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-emerald-200">
          <div className="font-black">Recursos do trial</div>
          <div className="mt-1 text-emerald-700">{data.recursosPadrao.length} recursos acompanhados</div>
          <div className="mt-3 font-black">Regra</div>
          <div className="mt-1 text-emerald-700">status teste_gratis/trial + prazo válido</div>
        </div>
      </div>
    </section>
  );
}
