import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  KeyRound,
  ShieldCheck,
  Trash2,
  Unlock,
} from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getOracleVpsSecurityEvents } from "@/lib/oracle-vps/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  desbloquearSalaoSegurancaAction,
  desbloquearUsuarioSegurancaAction,
  limparLogsSegurancaAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SecurityEventRow = {
  id?: string | null;
  user_id?: string | null;
  id_salao?: string | null;
  tipo_usuario?: string | null;
  evento?: string | null;
  risco?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  detalhes?: Record<string, unknown> | null;
  criado_em?: string | null;
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

function relativeTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime())) return "-";
  if (diff < 60_000) return "agora";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}

function riskClass(risk?: string | null) {
  const normalized = String(risk || "").toLowerCase();
  if (["critical", "critico", "crítico", "alto", "alta"].includes(normalized)) {
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

function formatEventName(value?: string | null) {
  return String(value || "evento")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function detailText(details?: Record<string, unknown> | null) {
  if (!details || typeof details !== "object") return "-";
  const prioridade = [
    "identidade",
    "motivo",
    "status",
    "bloqueado_ate",
    "tentativas_10_minutos",
    "tentativas_1_hora",
    "erro",
  ];

  const parts = prioridade
    .map((key) => {
      const value = details[key];
      if (value === null || value === undefined || value === "") return null;
      return `${key.replace(/_/g, " ")}: ${String(value)}`;
    })
    .filter(Boolean);

  if (parts.length) return parts.join(" · ");
  try {
    return JSON.stringify(details).slice(0, 180);
  } catch {
    return "-";
  }
}

async function loadSecurityData() {
  const supabase = getSupabaseAdmin();
  const [eventsResult, userStatusResult, saloesStatusResult] = await Promise.all([
    getOracleVpsSecurityEvents({ limit: 80 }).catch((error) => ({
      ok: false,
      service: "oracle-vps",
      provider: "erro",
      total: 0,
      byRisk: {},
      byEvent: {},
      items: [],
      error: error instanceof Error ? error.message : "Falha ao carregar eventos.",
    })),
    supabase
      .from("user_security_status")
      .select(
        "user_id, tipo_usuario, status, motivo, risco_atual, bloqueado_ate, verificacao_necessaria, atualizado_em"
      )
      .neq("status", "ativo")
      .order("atualizado_em", { ascending: false })
      .limit(60),
    supabase
      .from("saloes")
      .select("id, nome, status_seguranca, motivo_seguranca, bloqueado_ate")
      .neq("status_seguranca", "ativo")
      .order("nome", { ascending: true })
      .limit(60),
  ]);

  const userStatuses = ((userStatusResult.data || []) as UserSecurityRow[]).filter(
    (row) => row.user_id
  );
  const saloes = ((saloesStatusResult.data || []) as SalaoSecurityRow[]).filter(
    (row) => row.id
  );
  const userIds = userStatuses.map((row) => row.user_id);
  const salaoIds = Array.from(
    new Set(
      [
        ...saloes.map((row) => row.id),
        ...((eventsResult.items || []) as SecurityEventRow[])
          .map((event) => event.id_salao)
          .filter(Boolean),
      ] as string[]
    )
  );

  const [usuariosResult, clientesResult, profissionaisResult, saloesMapResult] =
    await Promise.all([
      userIds.length
        ? supabase.from("usuarios").select("id, nome, email").in("id", userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase
            .from("clientes_app_auth")
            .select("id, nome, email, telefone")
            .in("id", userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase.from("profissionais").select("id, nome, email, telefone").in("id", userIds)
        : Promise.resolve({ data: [] }),
      salaoIds.length
        ? supabase.from("saloes").select("id, nome").in("id", salaoIds)
        : Promise.resolve({ data: [] }),
    ]);

  const pessoaMap = new Map<string, { nome: string; contato: string }>();
  for (const row of (usuariosResult.data || []) as unknown as Array<
    Record<string, unknown>
  >) {
    pessoaMap.set(String(row.id), {
      nome: String(row.nome || "Usuário do salão"),
      contato: String(row.email || "-"),
    });
  }
  for (const row of (clientesResult.data || []) as unknown as Array<
    Record<string, unknown>
  >) {
    pessoaMap.set(String(row.id), {
      nome: String(row.nome || "Cliente do app"),
      contato: String(row.email || row.telefone || "-"),
    });
  }
  for (const row of (profissionaisResult.data || []) as unknown as Array<
    Record<string, unknown>
  >) {
    pessoaMap.set(String(row.id), {
      nome: String(row.nome || "Profissional"),
      contato: String(row.email || row.telefone || "-"),
    });
  }

  const salaoMap = new Map<string, string>();
  for (const row of (saloesMapResult.data || []) as unknown as Array<
    Record<string, unknown>
  >) {
    salaoMap.set(String(row.id), String(row.nome || "Salão"));
  }

  return {
    eventsResult,
    events: ((eventsResult.items || []) as SecurityEventRow[]).map((event) => ({
      ...event,
      salao_nome: event.id_salao ? salaoMap.get(event.id_salao) || "-" : "-",
      pessoa: event.user_id ? pessoaMap.get(event.user_id)?.nome || "-" : "-",
    })),
    userStatuses,
    saloes,
    pessoaMap,
  };
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

function UnblockUserButton({ row }: { row: UserSecurityRow }) {
  return (
    <form action={desbloquearUsuarioSegurancaAction}>
      <input type="hidden" name="userId" value={row.user_id} />
      <input type="hidden" name="tipoUsuario" value={row.tipo_usuario || "salao"} />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-950 transition hover:bg-emerald-100"
      >
        <Unlock size={14} />
        Desbloquear
      </button>
    </form>
  );
}

function UnblockSalaoButton({ row }: { row: SalaoSecurityRow }) {
  return (
    <form action={desbloquearSalaoSegurancaAction}>
      <input type="hidden" name="idSalao" value={row.id} />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-950 transition hover:bg-emerald-100"
      >
        <Unlock size={14} />
        Reativar salão
      </button>
    </form>
  );
}

export default async function AdminMasterSegurancaPage() {
  await requireAdminMasterUser("operacao_ver");
  const { eventsResult, events, userStatuses, saloes, pessoaMap } =
    await loadSecurityData();
  const highRisk = events.filter((event) =>
    ["critical", "alto", "alta", "critico", "crítico"].includes(
      String(event.risco || "").toLowerCase()
    )
  ).length;
  const loginFailures = events.filter(
    (event) => String(event.evento || "") === "login_falhou"
  ).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-zinc-900 bg-zinc-950 p-6 text-white shadow-sm lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-200/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-amber-100">
              Segurança do ecossistema
            </div>
            <h1 className="mt-5 font-display text-4xl font-black leading-tight md:text-5xl">
              Eventos, bloqueios e análise de risco em um só lugar.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300">
              Esta tela lê os eventos gravados pela VPS, mostra usuários e salões
              bloqueados no banco principal e permite desbloquear com auditoria.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
              Retenção automática
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Mantém o banco principal leve e limpa eventos antigos no banco de
              segurança separado, sem pesar no Supabase principal.
            </p>
            <form action={limparLogsSegurancaAction} className="mt-4">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-zinc-200"
              >
                <Trash2 size={16} />
                Limpar logs antigos
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Eventos recentes"
          value={String(events.length)}
          hint={`Fonte: ${eventsResult.provider || "VPS"}.`}
          icon={ShieldCheck}
          tone="green"
        />
        <MetricCard
          label="Falhas de login"
          value={String(loginFailures)}
          hint="Tentativas registradas pela camada de segurança."
          icon={KeyRound}
          tone={loginFailures ? "amber" : "green"}
        />
        <MetricCard
          label="Risco alto"
          value={String(highRisk)}
          hint="Eventos que merecem revisão do Admin Master."
          icon={AlertTriangle}
          tone={highRisk ? "red" : "green"}
        />
        <MetricCard
          label="Bloqueios ativos"
          value={String(userStatuses.length + saloes.length)}
          hint="Usuários e salões aguardando ação ou expiração."
          icon={Clock3}
          tone={userStatuses.length + saloes.length ? "amber" : "green"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
                Usuários bloqueados
              </div>
              <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
                Acesso individual
              </h2>
            </div>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-600">
              {userStatuses.length} registro(s)
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {userStatuses.length ? (
              userStatuses.map((row) => {
                const pessoa = pessoaMap.get(row.user_id);
                return (
                  <div
                    key={row.user_id}
                    className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="truncate text-sm text-zinc-950">
                            {pessoa?.nome || row.user_id}
                          </strong>
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-black ${statusClass(
                              row.status
                            )}`}
                          >
                            {formatEventName(row.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          {pessoa?.contato || "-"} · {row.tipo_usuario || "usuário"} ·{" "}
                          {row.motivo || "Sem motivo detalhado."}
                        </p>
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                          Até {dateTime(row.bloqueado_ate)} · atualizado {relativeTime(row.atualizado_em)}
                        </p>
                      </div>
                      <UnblockUserButton row={row} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-6 text-sm font-bold text-emerald-950">
                Nenhum usuário bloqueado agora.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
                Salões em análise
              </div>
              <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
                Status de segurança
              </h2>
            </div>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-600">
              {saloes.length} salão(ões)
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {saloes.length ? (
              saloes.map((row) => (
                <div
                  key={row.id}
                  className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin-master/saloes/${row.id}`}
                          className="truncate text-sm font-black text-zinc-950 hover:underline"
                        >
                          {row.nome || "Salão sem nome"}
                        </Link>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-black ${statusClass(
                            row.status_seguranca
                          )}`}
                        >
                          {formatEventName(row.status_seguranca)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        {row.motivo_seguranca || "Sem motivo detalhado."}
                      </p>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                        Bloqueado até {dateTime(row.bloqueado_ate)}
                      </p>
                    </div>
                    <UnblockSalaoButton row={row} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-6 text-sm font-bold text-emerald-950">
                Nenhum salão bloqueado por segurança.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
              Security events
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
              Últimos eventos capturados pela VPS
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-600">
            <CheckCircle2 size={14} />
            IP principal corrigido
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-[24px] border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-100 text-left text-sm">
              <thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-black">Evento</th>
                  <th className="px-4 py-3 font-black">Pessoa</th>
                  <th className="px-4 py-3 font-black">Salão</th>
                  <th className="px-4 py-3 font-black">Risco</th>
                  <th className="px-4 py-3 font-black">IP</th>
                  <th className="px-4 py-3 font-black">Detalhes</th>
                  <th className="px-4 py-3 font-black">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {events.length ? (
                  events.map((event) => (
                    <tr key={event.id || `${event.evento}-${event.criado_em}`}>
                      <td className="px-4 py-4 font-black text-zinc-950">
                        {formatEventName(event.evento)}
                      </td>
                      <td className="px-4 py-4 text-zinc-600">
                        {(event as SecurityEventRow & { pessoa?: string }).pessoa || "-"}
                        <div className="mt-1 text-xs text-zinc-400">
                          {event.tipo_usuario || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-zinc-600">
                        {(event as SecurityEventRow & { salao_nome?: string }).salao_nome || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-black ${riskClass(
                            event.risco
                          )}`}
                        >
                          {String(event.risco || "info")}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-zinc-600">
                        {event.ip || "-"}
                      </td>
                      <td className="max-w-[380px] px-4 py-4 text-xs leading-5 text-zinc-500">
                        {detailText(event.detalhes)}
                      </td>
                      <td className="px-4 py-4 text-xs text-zinc-500">
                        {dateTime(event.criado_em)}
                        <div className="mt-1 font-bold text-zinc-400">
                          {relativeTime(event.criado_em)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                      Nenhum evento de segurança retornado pela VPS.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
