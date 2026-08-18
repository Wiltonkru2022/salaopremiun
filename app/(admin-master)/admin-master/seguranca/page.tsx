import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Trash2,
  Unlock,
} from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  desbloquearSalaoSegurancaAction,
  desbloquearUsuarioSegurancaAction,
  limparLogsSegurancaAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SecurityEventRow = {
  id: string;
  id_usuario: string | null;
  id_salao: string | null;
  tipo_evento: string | null;
  severidade: string | null;
  mensagem: string | null;
  detalhes_json: Record<string, unknown> | null;
  created_at: string | null;
};

type UserSecurityRow = {
  user_id: string;
  tipo_usuario: string | null;
  status: string | null;
  motivo: string | null;
  risco_atual: string | null;
  bloqueado_ate: string | null;
  verificacao_necessaria: boolean | null;
  atualizado_em: string | null;
};

type SalaoSecurityRow = {
  id: string;
  nome: string | null;
  status_seguranca: string | null;
  motivo_seguranca: string | null;
  bloqueado_ate: string | null;
};

function dateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

function riskClass(risk?: string | null) {
  const normalized = String(risk || "").toLowerCase();
  if (["critical", "critico", "crítico", "error", "alto", "alta"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-950";
  }
  if (["warning", "medio", "médio", "medium"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-950";
}

function statusClass(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("bloqueado")) return "border-red-200 bg-red-50 text-red-950";
  if (normalized.includes("verificacao") || normalized.includes("analise")) {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-950";
}

function detailText(details?: Record<string, unknown> | null) {
  if (!details || typeof details !== "object") return "-";
  const preferred = [
    "tipoUsuario",
    "risco",
    "ip",
    "identidade",
    "motivo",
    "status",
    "tentativas_10_minutos",
    "tentativas_1_hora",
  ];
  const values = preferred
    .map((key) => {
      const value = details[key];
      return value === null || value === undefined || value === ""
        ? null
        : `${key}: ${String(value)}`;
    })
    .filter(Boolean);
  if (values.length) return values.join(" · ");
  return JSON.stringify(details).slice(0, 180);
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof ShieldCheck;
  tone?: "default" | "red" | "amber" | "green";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-950"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-zinc-200 bg-white text-zinc-950";

  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.24em] opacity-60">
            {label}
          </div>
          <div className="mt-3 font-display text-3xl font-black">{value}</div>
          <p className="mt-2 text-sm leading-6 opacity-75">{hint}</p>
        </div>
        <Icon className="mt-1 h-5 w-5 shrink-0 opacity-70" />
      </div>
    </div>
  );
}

export default async function AdminMasterSegurancaPage() {
  await requireAdminMasterUser("operacao_ver");
  const supabase = getSupabaseAdmin();

  const [eventsResult, usersResult, saloesResult] = await Promise.all([
    (supabase as any)
      .from("eventos_sistema")
      .select(
        "id, id_usuario, id_salao, tipo_evento, severidade, mensagem, detalhes_json, created_at"
      )
      .eq("modulo", "security")
      .order("created_at", { ascending: false })
      .limit(80),
    (supabase as any)
      .from("user_security_status")
      .select(
        "user_id, tipo_usuario, status, motivo, risco_atual, bloqueado_ate, verificacao_necessaria, atualizado_em"
      )
      .neq("status", "ativo")
      .order("atualizado_em", { ascending: false })
      .limit(60),
    (supabase as any)
      .from("saloes")
      .select("id, nome, status_seguranca, motivo_seguranca, bloqueado_ate")
      .neq("status_seguranca", "ativo")
      .order("nome", { ascending: true })
      .limit(60),
  ]);

  const events = ((eventsResult.data || []) as SecurityEventRow[]).filter((row) => row.id);
  const users = ((usersResult.data || []) as UserSecurityRow[]).filter((row) => row.user_id);
  const saloes = ((saloesResult.data || []) as SalaoSecurityRow[]).filter((row) => row.id);
  const highRisk = events.filter((event) =>
    ["critical", "error"].includes(String(event.severidade || "").toLowerCase())
  ).length;
  const loginFailures = events.filter((event) =>
    String(event.tipo_evento || "").toLowerCase().includes("login_falhou")
  ).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-zinc-900 bg-zinc-950 p-6 text-white shadow-sm lg:p-8">
        <div className="max-w-4xl">
          <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-200/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-amber-100">
            Segurança do ecossistema
          </div>
          <h1 className="mt-5 font-display text-4xl font-black leading-tight md:text-5xl">
            Eventos, bloqueios e risco no banco principal.
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            Os eventos são gravados diretamente no Supabase e o Admin Master opera desbloqueios e retenção sem depender de servidor externo.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Eventos recentes"
          value={String(events.length)}
          hint="Últimos eventos persistidos pelo monitoramento nativo."
          icon={Clock3}
        />
        <MetricCard
          label="Alto risco"
          value={String(highRisk)}
          hint="Eventos críticos ou de erro na amostra atual."
          icon={AlertTriangle}
          tone={highRisk ? "red" : "green"}
        />
        <MetricCard
          label="Falhas de login"
          value={String(loginFailures)}
          hint="Tentativas registradas pelo módulo de segurança."
          icon={ShieldCheck}
          tone={loginFailures ? "amber" : "green"}
        />
        <MetricCard
          label="Bloqueios ativos"
          value={String(users.length + saloes.length)}
          hint={`${users.length} usuário(s) e ${saloes.length} salão(ões).`}
          icon={Unlock}
          tone={users.length + saloes.length ? "amber" : "green"}
        />
      </section>

      <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
              Retenção
            </div>
            <h2 className="mt-2 font-display text-2xl font-black">Logs de segurança</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Remove tentativas antigas do banco principal conforme a política de retenção.
            </p>
          </div>
          <form action={limparLogsSegurancaAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-900"
            >
              <Trash2 size={15} />
              Aplicar retenção
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl font-black">Usuários bloqueados</h2>
          <div className="mt-4 space-y-3">
            {users.length ? users.map((row) => (
              <div key={row.user_id} className={`rounded-[22px] border p-4 ${statusClass(row.status)}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black">{row.tipo_usuario || "Usuário"}</div>
                    <div className="mt-1 break-all text-xs opacity-70">{row.user_id}</div>
                    <div className="mt-2 text-sm">{row.motivo || "Bloqueio de segurança"}</div>
                    <div className="mt-1 text-xs opacity-70">Atualizado: {dateTime(row.atualizado_em)}</div>
                  </div>
                  <form action={desbloquearUsuarioSegurancaAction}>
                    <input type="hidden" name="userId" value={row.user_id} />
                    <input type="hidden" name="tipoUsuario" value={row.tipo_usuario || "salao"} />
                    <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black shadow-sm">
                      <Unlock size={14} />
                      Desbloquear
                    </button>
                  </form>
                </div>
              </div>
            )) : (
              <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-6 text-sm text-zinc-500">
                Nenhum usuário bloqueado.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl font-black">Salões bloqueados</h2>
          <div className="mt-4 space-y-3">
            {saloes.length ? saloes.map((row) => (
              <div key={row.id} className={`rounded-[22px] border p-4 ${statusClass(row.status_seguranca)}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black">{row.nome || "Salão"}</div>
                    <div className="mt-2 text-sm">{row.motivo_seguranca || "Bloqueio de segurança"}</div>
                    <div className="mt-1 text-xs opacity-70">Até: {dateTime(row.bloqueado_ate)}</div>
                  </div>
                  <form action={desbloquearSalaoSegurancaAction}>
                    <input type="hidden" name="idSalao" value={row.id} />
                    <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black shadow-sm">
                      <CheckCircle2 size={14} />
                      Reativar
                    </button>
                  </form>
                </div>
              </div>
            )) : (
              <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-6 text-sm text-zinc-500">
                Nenhum salão bloqueado por segurança.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Telemetria</div>
            <h2 className="mt-2 font-display text-2xl font-black">Eventos recentes</h2>
          </div>
          <ShieldCheck className="text-zinc-400" />
        </div>
        <div className="mt-4 space-y-3">
          {events.length ? events.map((event) => (
            <div key={event.id} className={`rounded-[20px] border p-4 ${riskClass(event.severidade)}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black">{String(event.tipo_evento || "evento").replace(/_/g, " ")}</div>
                  <div className="mt-1 text-sm opacity-80">{event.mensagem || "Evento de segurança"}</div>
                  <div className="mt-2 break-words text-xs opacity-70">{detailText(event.detalhes_json)}</div>
                </div>
                <div className="shrink-0 text-right text-xs font-bold opacity-70">
                  <div>{event.severidade || "info"}</div>
                  <div className="mt-1">{dateTime(event.created_at)}</div>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
              Nenhum evento de segurança registrado ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
