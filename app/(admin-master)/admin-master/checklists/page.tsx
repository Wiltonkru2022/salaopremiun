import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  Gift,
  RefreshCcw,
  SlidersHorizontal,
} from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function jsonText(value: Json | null | undefined) {
  if (!value) return "{}";
  return JSON.stringify(value, null, 2);
}

function salonName(map: Map<string, SalonRow>, id: string) {
  return map.get(id)?.nome || id;
}

function KpiCard({
  label,
  value,
  hint,
  tone = "white",
}: {
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
    <div className={`rounded-[24px] border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs font-black uppercase tracking-[0.24em] opacity-60">
        {label}
      </div>
      <div className="mt-2 font-display text-[2rem] font-black">{value}</div>
      <p className="mt-1 text-sm leading-5 opacity-70">{hint}</p>
    </div>
  );
}

function ChecklistForm({ item }: { item?: ChecklistItem }) {
  return (
    <form
      action={salvarChecklistItemAdminMaster}
      className="grid gap-3 rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm"
    >
      {item?.id ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className="grid gap-3 md:grid-cols-[150px_1fr_120px_100px]">
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
          Código
          <input
            name="codigo"
            defaultValue={item?.codigo || ""}
            required
            className="h-10 rounded-2xl border border-zinc-200 px-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
          Nome
          <input
            name="nome"
            defaultValue={item?.nome || ""}
            required
            className="h-10 rounded-2xl border border-zinc-200 px-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
          Peso
          <input
            name="peso"
            type="number"
            min={0}
            defaultValue={item?.peso ?? 10}
            className="h-10 rounded-2xl border border-zinc-200 px-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
          Ordem
          <input
            name="ordem"
            type="number"
            defaultValue={item?.ordem ?? 0}
            className="h-10 rounded-2xl border border-zinc-200 px-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-[170px_1fr]">
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
          Categoria
          <input
            name="categoria"
            defaultValue={item?.categoria || "onboarding"}
            className="h-10 rounded-2xl border border-zinc-200 px-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
          Descrição
          <input
            name="descricao"
            defaultValue={item?.descricao || ""}
            className="h-10 rounded-2xl border border-zinc-200 px-3 text-sm font-semibold normal-case tracking-normal text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
      </div>
      <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
        Regra JSON
        <textarea
          name="regra_json"
          rows={3}
          defaultValue={jsonText(item?.regra_json)}
          className="resize-none rounded-2xl border border-zinc-200 p-3 font-mono text-xs normal-case tracking-normal text-zinc-800 outline-none focus:border-zinc-500"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={item?.ativo ?? true}
            className="h-4 w-4"
          />
          Critério ativo
        </label>
        <button className="h-10 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800">
          {item ? "Salvar critério" : "Criar critério"}
        </button>
      </div>
    </form>
  );
}

function TrialRuleForm({ rule }: { rule?: TrialRule }) {
  return (
    <form
      action={salvarRegraTrialAdminMaster}
      className="grid gap-3 rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm"
    >
      {rule?.id ? <input type="hidden" name="id" value={rule.id} /> : null}
      <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
        Nome da regra
        <input
          name="nome"
          required
          defaultValue={rule?.nome || ""}
          className="h-10 rounded-2xl border border-zinc-200 px-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none focus:border-zinc-500"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
          Score mínimo
          <input
            name="score_minimo"
            type="number"
            min={0}
            max={100}
            defaultValue={rule?.score_minimo ?? 70}
            className="h-10 rounded-2xl border border-zinc-200 px-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
          Dias extras
          <input
            name="dias_extra"
            type="number"
            min={0}
            defaultValue={rule?.dias_extra ?? 7}
            className="h-10 rounded-2xl border border-zinc-200 px-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={rule?.ativo ?? true}
            className="h-4 w-4"
          />
          Regra ativa
        </label>
        <button className="h-10 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800">
          {rule ? "Salvar regra" : "Criar regra"}
        </button>
      </div>
    </form>
  );
}

export default async function AdminMasterChecklistsPage() {
  await requireAdminMasterUser("produto_ver");
  const supabase = getSupabaseAdmin();

  const [{ data: checklistData }, { data: trialRulesData }, { data: scoresData }, { data: historyData }] =
    await Promise.all([
      (supabase as any)
        .from("checklist_itens")
        .select("id, codigo, nome, descricao, ativo, ordem, peso, categoria, regra_json")
        .order("ordem", { ascending: true }),
      supabase
        .from("trial_extensoes_regras")
        .select("id, nome, score_minimo, dias_extra, ativo, criado_em")
        .order("score_minimo", { ascending: true }),
      supabase
        .from("score_onboarding_salao")
        .select("id, id_salao, score_total, dias_com_acesso, modulos_usados, detalhes_json, atualizado_em")
        .order("atualizado_em", { ascending: false })
        .limit(12),
      supabase
        .from("trial_extensoes_automaticas")
        .select("id, id_salao, trial_original_fim, trial_novo_fim, score_atingido, motivo, criado_em")
        .order("criado_em", { ascending: false })
        .limit(10),
    ]);

  const checklist = ((checklistData || []) as ChecklistItem[]) || [];
  const trialRules = ((trialRulesData || []) as TrialRule[]) || [];
  const scores = ((scoresData || []) as ScoreRow[]) || [];
  const history = ((historyData || []) as TrialHistory[]) || [];
  const salonIds = Array.from(
    new Set([...scores.map((item) => item.id_salao), ...history.map((item) => item.id_salao)])
  );

  const { data: saloesData } = salonIds.length
    ? await supabase
        .from("saloes")
        .select("id, nome, email, plano, trial_fim_em")
        .in("id", salonIds)
    : { data: [] };

  const saloes = new Map(
    (((saloesData || []) as SalonRow[]) || []).map((salao) => [salao.id, salao])
  );
  const activeCriteria = checklist.filter((item) => item.ativo);
  const totalWeight = activeCriteria.reduce((sum, item) => sum + Number(item.peso || 0), 0);
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, row) => sum + Number(row.score_total || 0), 0) / scores.length)
    : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] bg-zinc-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-emerald-100">
              <ClipboardCheck size={14} />
              Checklists
            </div>
            <h1 className="mt-4 font-display text-[2rem] font-black">
              Checklists e trial extra
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
              Ajuste critérios, pesos do score de onboarding e regras de trial
              extra. Tudo fica auditado para o Admin Master entender por que um
              salão ganhou ou não ganhou dias extras.
            </p>
          </div>
          <Link
            href="/admin-master/logs?busca=checklist"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Ver auditoria
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Critérios ativos"
          value={String(activeCriteria.length)}
          hint="Itens que entram no score."
          tone="green"
        />
        <KpiCard
          label="Peso total"
          value={String(totalWeight)}
          hint="Normalizado para score final de 0 a 100."
          tone="blue"
        />
        <KpiCard
          label="Score médio"
          value={`${averageScore}%`}
          hint="Média dos últimos salões calculados."
          tone="amber"
        />
        <KpiCard
          label="Trial aplicado"
          value={String(history.length)}
          hint="Últimas extensões registradas."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-500">
              <SlidersHorizontal size={16} />
              Critérios do score
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Altere peso, descrição e regra técnica. O cálculo usa o peso dos
              critérios ativos e recalcula o resultado em porcentagem.
            </p>
          </div>
          {checklist.map((item) => (
            <ChecklistForm key={item.id} item={item} />
          ))}
          <details className="rounded-[24px] border border-dashed border-zinc-300 bg-white p-4">
            <summary className="cursor-pointer text-sm font-black text-zinc-900">
              Criar novo critério
            </summary>
            <div className="mt-4">
              <ChecklistForm />
            </div>
          </details>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              <Gift size={16} />
              Regras de trial extra
            </div>
            <div className="mt-4 space-y-3">
              {trialRules.map((rule) => (
                <TrialRuleForm key={rule.id} rule={rule} />
              ))}
              <details className="rounded-[18px] border border-dashed border-zinc-300 p-3">
                <summary className="cursor-pointer text-sm font-black">
                  Criar nova regra
                </summary>
                <div className="mt-3">
                  <TrialRuleForm />
                </div>
              </details>
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              <RefreshCcw size={16} />
              Recalcular salão
            </div>
            <div className="mt-4 space-y-3">
              {scores.slice(0, 6).map((score) => (
                <div
                  key={score.id}
                  className="rounded-[18px] border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-zinc-950">
                        {salonName(saloes, score.id_salao)}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-zinc-500">
                        Atualizado em {formatDate(score.atualizado_em)}
                      </div>
                    </div>
                    <div className="rounded-full bg-zinc-950 px-3 py-1 text-sm font-black text-white">
                      {score.score_total}%
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-zinc-600">
                    <span>Dias: {score.dias_com_acesso}</span>
                    <span>Módulos: {score.modulos_usados}</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <form action={recalcularScoreSalaoAdminMaster}>
                      <input type="hidden" name="id_salao" value={score.id_salao} />
                      <button className="h-9 w-full rounded-2xl border border-zinc-200 bg-white text-xs font-black text-zinc-800 transition hover:bg-zinc-100">
                        Recalcular
                      </button>
                    </form>
                    <form action={avaliarTrialExtraSalaoAdminMaster}>
                      <input type="hidden" name="id_salao" value={score.id_salao} />
                      <button className="h-9 w-full rounded-2xl bg-emerald-700 text-xs font-black text-white transition hover:bg-emerald-800">
                        Avaliar trial
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 p-4">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
            <CheckCircle2 size={16} />
            Histórico de trial extra
          </div>
        </div>
        <div className="scroll-premium overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.18em] text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-bold">Salão</th>
                <th className="px-4 py-3 font-bold">Score</th>
                <th className="px-4 py-3 font-bold">Trial anterior</th>
                <th className="px-4 py-3 font-bold">Novo trial</th>
                <th className="px-4 py-3 font-bold">Motivo</th>
                <th className="px-4 py-3 font-bold">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {history.length ? (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 font-black text-zinc-950">
                      {salonName(saloes, item.id_salao)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{item.score_atingido}%</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {formatDate(item.trial_original_fim)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {formatDate(item.trial_novo_fim)}
                    </td>
                    <td className="max-w-[360px] px-4 py-3 text-zinc-700">
                      {item.motivo || "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {formatDate(item.criado_em)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    Nenhuma extensão de trial aplicada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
