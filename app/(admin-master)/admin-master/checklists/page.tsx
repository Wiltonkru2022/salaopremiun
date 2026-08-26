import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Gift, RefreshCcw, SlidersHorizontal } from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getDatabaseAdmin } from "@/lib/db/admin";
import type { Json } from "@/types/database.generated";
import {
  avaliarTrialExtraSalaoAdminMaster,
  recalcularScoreSalaoAdminMaster,
  salvarChecklistItemAdminMaster,
  salvarRegraTrialAdminMaster,
} from "./actions";

export const dynamic = "force-dynamic";

type ChecklistItem = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  peso?: number | null;
  categoria?: string | null;
  regra_json?: Json | null;
};

type TrialRule = {
  id: string;
  nome: string;
  score_minimo: number;
  dias_extra: number;
  ativo: boolean;
  criado_em: string;
};

type ScoreRow = {
  id: string;
  id_salao: string;
  score_total: number;
  dias_com_acesso: number;
  modulos_usados: number;
  detalhes_json: Json;
  atualizado_em: string;
};

type SalonRow = {
  id: string;
  nome: string | null;
  email: string | null;
  plano: string | null;
  trial_fim_em: string | null;
};

type TrialHistory = {
  id: string;
  id_salao: string;
  trial_original_fim: string | null;
  trial_novo_fim: string;
  score_atingido: number;
  motivo: string | null;
  criado_em: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(date);
}

function jsonText(value: Json | null | undefined) {
  if (!value) return "{}";
  return JSON.stringify(value, null, 2);
}

function salonName(map: Map<string, SalonRow>, id: string) {
  return map.get(id)?.nome || id;
}

function KpiCard({ label, value, hint, tone = "white" }: {
  label: string;
  value: string;
  hint: string;
  tone?: "white" | "green" | "amber" | "blue";
}) {
  const toneClass = {
    white: "border-zinc-200 bg-white text-zinc-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight">{value}</div>
      <p className="mt-1 text-sm leading-5 opacity-70">{hint}</p>
    </div>
  );
}

function inputClass() {
  return "h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-zinc-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{children}</span>;
}

function ChecklistForm({ item }: { item?: ChecklistItem }) {
  return (
    <form action={salvarChecklistItemAdminMaster} className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      {item?.id ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-black text-zinc-950">{item?.nome || "Novo critério"}</div>
          <div className="mt-1 text-xs text-zinc-500">Configure o que o administrador precisa entender; a regra técnica fica recolhida.</div>
        </div>
        {item ? <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${item.ativo ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-500"}`}>{item.ativo ? "Ativo" : "Inativo"}</span> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[160px_minmax(220px,1fr)_120px_100px]">
        <label className="grid gap-1.5"><FieldLabel>Código</FieldLabel><input name="codigo" defaultValue={item?.codigo || ""} required className={inputClass()} /></label>
        <label className="grid gap-1.5"><FieldLabel>Nome</FieldLabel><input name="nome" defaultValue={item?.nome || ""} required className={inputClass()} /></label>
        <label className="grid gap-1.5"><FieldLabel>Peso</FieldLabel><input name="peso" type="number" min={0} defaultValue={item?.peso ?? 10} className={inputClass()} /></label>
        <label className="grid gap-1.5"><FieldLabel>Ordem</FieldLabel><input name="ordem" type="number" defaultValue={item?.ordem ?? 0} className={inputClass()} /></label>
      </div>

      <div className="grid gap-3 md:grid-cols-[180px_1fr]">
        <label className="grid gap-1.5"><FieldLabel>Categoria</FieldLabel><input name="categoria" defaultValue={item?.categoria || "onboarding"} className={inputClass()} /></label>
        <label className="grid gap-1.5"><FieldLabel>Descrição</FieldLabel><input name="descricao" defaultValue={item?.descricao || ""} className={inputClass()} /></label>
      </div>

      <details className="rounded-xl border border-zinc-200 bg-zinc-50">
        <summary className="cursor-pointer px-3.5 py-3 text-xs font-bold text-zinc-600">Configuração técnica avançada</summary>
        <div className="border-t border-zinc-200 p-3.5">
          <p className="mb-2 text-xs leading-5 text-zinc-500">Edite o JSON somente quando precisar alterar a lógica interna do critério.</p>
          <textarea name="regra_json" rows={4} defaultValue={jsonText(item?.regra_json)} className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-800 outline-none focus:border-violet-300" />
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700">
          <input type="checkbox" name="ativo" defaultChecked={item?.ativo ?? true} className="h-4 w-4 accent-violet-700" />
          Critério ativo
        </label>
        <button className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800">{item ? "Salvar critério" : "Criar critério"}</button>
      </div>
    </form>
  );
}

function TrialRuleForm({ rule }: { rule?: TrialRule }) {
  return (
    <form action={salvarRegraTrialAdminMaster} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      {rule?.id ? <input type="hidden" name="id" value={rule.id} /> : null}
      <label className="grid gap-1.5"><FieldLabel>Nome da regra</FieldLabel><input name="nome" required defaultValue={rule?.nome || ""} className={inputClass()} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5"><FieldLabel>Score mínimo</FieldLabel><input name="score_minimo" type="number" min={0} max={100} defaultValue={rule?.score_minimo ?? 70} className={inputClass()} /></label>
        <label className="grid gap-1.5"><FieldLabel>Dias extras</FieldLabel><input name="dias_extra" type="number" min={0} defaultValue={rule?.dias_extra ?? 7} className={inputClass()} /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700"><input type="checkbox" name="ativo" defaultChecked={rule?.ativo ?? true} className="h-4 w-4 accent-violet-700" />Regra ativa</label>
        <button className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800">{rule ? "Salvar regra" : "Criar regra"}</button>
      </div>
    </form>
  );
}

export default async function AdminMasterChecklistsPage() {
  await requireAdminMasterUser("produto_ver");
  const database = getDatabaseAdmin();

  const [{ data: checklistData }, { data: trialRulesData }, { data: scoresData }, { data: historyData }] = await Promise.all([
    (database as any).from("checklist_itens").select("id, codigo, nome, descricao, ativo, ordem, peso, categoria, regra_json").order("ordem", { ascending: true }),
    database.from("trial_extensoes_regras").select("id, nome, score_minimo, dias_extra, ativo, criado_em").order("score_minimo", { ascending: true }),
    database.from("score_onboarding_salao").select("id, id_salao, score_total, dias_com_acesso, modulos_usados, detalhes_json, atualizado_em").order("atualizado_em", { ascending: false }).limit(12),
    database.from("trial_extensoes_automaticas").select("id, id_salao, trial_original_fim, trial_novo_fim, score_atingido, motivo, criado_em").order("criado_em", { ascending: false }).limit(10),
  ]);

  const checklist = (checklistData || []) as ChecklistItem[];
  const trialRules = (trialRulesData || []) as TrialRule[];
  const scores = (scoresData || []) as ScoreRow[];
  const history = (historyData || []) as TrialHistory[];
  const salonIds = Array.from(new Set([...scores.map((item) => item.id_salao), ...history.map((item) => item.id_salao)]));

  const { data: saloesData } = salonIds.length
    ? await database.from("saloes").select("id, nome, email, plano, trial_fim_em").in("id", salonIds)
    : { data: [] };

  const saloes = new Map(((saloesData || []) as SalonRow[]).map((salao) => [salao.id, salao]));
  const activeCriteria = checklist.filter((item) => item.ativo);
  const totalWeight = activeCriteria.reduce((sum, item) => sum + Number(item.peso || 0), 0);
  const averageScore = scores.length ? Math.round(scores.reduce((sum, row) => sum + Number(row.score_total || 0), 0) / scores.length) : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-600"><ClipboardCheck size={15} />Produto</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">Checklists e trial extra</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Critérios do onboarding e regras de extensão de trial em linguagem operacional. Configurações técnicas ficam recolhidas.</p>
          </div>
          <Link href="/admin-master/logs?busca=checklist" className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Ver auditoria</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Critérios ativos" value={String(activeCriteria.length)} hint="Itens que entram no score." tone="green" />
        <KpiCard label="Peso total" value={String(totalWeight)} hint="Base usada no score final." tone="blue" />
        <KpiCard label="Score médio" value={`${averageScore}%`} hint="Média dos últimos salões calculados." tone="amber" />
        <KpiCard label="Trials aplicados" value={String(history.length)} hint="Últimas extensões registradas." />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-zinc-800"><SlidersHorizontal size={16} />Critérios do score</div>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">No uso normal, ajuste nome, categoria, peso, ordem e status. A regra JSON só aparece em “Configuração técnica avançada”.</p>
          </div>
          {checklist.map((item) => <ChecklistForm key={item.id} item={item} />)}
          <details className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4">
            <summary className="cursor-pointer text-sm font-black text-zinc-900">Criar novo critério</summary>
            <div className="mt-4"><ChecklistForm /></div>
          </details>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-zinc-900"><Gift size={16} className="text-violet-600" />Regras de trial extra</div>
            <div className="mt-4 space-y-3">
              {trialRules.map((rule) => <TrialRuleForm key={rule.id} rule={rule} />)}
              <details className="rounded-xl border border-dashed border-zinc-300 p-3"><summary className="cursor-pointer text-sm font-black">Criar nova regra</summary><div className="mt-3"><TrialRuleForm /></div></details>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-zinc-900"><RefreshCcw size={16} className="text-violet-600" />Recalcular salão</div>
            <div className="mt-4 space-y-3">
              {scores.slice(0, 6).map((score) => (
                <div key={score.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="font-black text-zinc-950">{salonName(saloes, score.id_salao)}</div><div className="mt-1 text-xs text-zinc-500">{formatDate(score.atualizado_em)}</div></div>
                    <div className="rounded-full bg-zinc-950 px-3 py-1 text-sm font-black text-white">{score.score_total}%</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-zinc-600"><span>Dias: {score.dias_com_acesso}</span><span>Módulos: {score.modulos_usados}</span></div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <form action={recalcularScoreSalaoAdminMaster}><input type="hidden" name="id_salao" value={score.id_salao} /><button className="h-9 w-full rounded-xl border border-zinc-200 bg-white text-xs font-black text-zinc-800 hover:bg-zinc-100">Recalcular</button></form>
                    <form action={avaliarTrialExtraSalaoAdminMaster}><input type="hidden" name="id_salao" value={score.id_salao} /><button className="h-9 w-full rounded-xl bg-emerald-700 text-xs font-black text-white hover:bg-emerald-800">Avaliar trial</button></form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 p-4"><div className="flex items-center gap-2 text-sm font-black text-zinc-900"><CheckCircle2 size={16} className="text-emerald-600" />Histórico de trial extra</div></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100 text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr><th className="px-4 py-3 font-bold">Salão</th><th className="px-4 py-3 font-bold">Score</th><th className="px-4 py-3 font-bold">Trial anterior</th><th className="px-4 py-3 font-bold">Novo trial</th><th className="px-4 py-3 font-bold">Motivo</th><th className="px-4 py-3 font-bold">Criado em</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {history.length ? history.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/80"><td className="px-4 py-3 font-black text-zinc-950">{salonName(saloes, item.id_salao)}</td><td className="px-4 py-3 text-zinc-700">{item.score_atingido}%</td><td className="px-4 py-3 text-zinc-700">{formatDate(item.trial_original_fim)}</td><td className="px-4 py-3 text-zinc-700">{formatDate(item.trial_novo_fim)}</td><td className="max-w-[360px] px-4 py-3 text-zinc-700">{item.motivo || "-"}</td><td className="px-4 py-3 text-zinc-700">{formatDate(item.criado_em)}</td></tr>
              )) : <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Nenhuma extensão de trial aplicada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
