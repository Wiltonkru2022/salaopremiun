import { runAdminOperation } from "@/lib/db/admin-ops";
import type { AdminTicketListParams } from "@/lib/support/tickets";

const OPEN_STATUSES = ["aberto", "em_atendimento", "aguardando_cliente", "aguardando_tecnico"];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export type AdminTicketGlobalMetrics = {
  total: number;
  abertos: number;
  slaVencido: number;
  slaProximo: number;
  semResponsavel: number;
};

export async function getAdminTicketGlobalMetrics(params?: AdminTicketListParams): Promise<AdminTicketGlobalMetrics> {
  return runAdminOperation({
    action: "support_admin_ticket_global_metrics",
    run: async (supabase) => {
      const search = normalizeText(params?.search).slice(0, 80);
      const now = new Date();
      const nowIso = now.toISOString();
      const nextFourHoursIso = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
      let salaoSearchIds: string[] = [];

      if (search.length >= 2) {
        const cleanSearch = search.replace(/[,%()]/g, " ").trim();
        const { data: salaoMatches } = await supabase
          .from("saloes")
          .select("id")
          .or(`nome.ilike.%${cleanSearch}%,responsavel.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`)
          .limit(40);
        salaoSearchIds = ((salaoMatches || []) as Array<{ id: string }>).map((item) => item.id);
      }

      const makeBaseQuery = () => {
        let query = supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .neq("origem", "app_profissional_login");

        if (params?.status && params.status !== "todos") query = query.eq("status", params.status);
        if (params?.prioridade && params.prioridade !== "todas") query = query.eq("prioridade", params.prioridade);
        if (params?.responsavelAdminId === "sem_responsavel") query = query.is("id_responsavel_admin", null);
        else if (params?.responsavelAdminId && params.responsavelAdminId !== "todos") query = query.eq("id_responsavel_admin", params.responsavelAdminId);

        if (params?.recovery === "sim") query = query.contains("origem_contexto", { tipo_fluxo: "recuperacao_2fa" });
        else if (params?.recovery === "nao") query = query.or("origem_contexto.is.null,origem_contexto->>tipo_fluxo.neq.recuperacao_2fa");

        if (params?.periodDays && params.periodDays > 0) {
          query = query.gte("criado_em", new Date(now.getTime() - params.periodDays * 24 * 60 * 60 * 1000).toISOString());
        }

        if (params?.sla === "vencido") query = query.in("status", OPEN_STATUSES).lt("sla_limite_em", nowIso);
        else if (params?.sla === "proximo") query = query.in("status", OPEN_STATUSES).gte("sla_limite_em", nowIso).lte("sla_limite_em", nextFourHoursIso);
        else if (params?.sla === "ok") query = query.gte("sla_limite_em", nowIso);

        if (search.length >= 2) {
          const cleanSearch = search.replace(/[,%()]/g, " ").trim();
          const searchParts = [
            `assunto.ilike.%${cleanSearch}%`,
            `solicitante_nome.ilike.%${cleanSearch}%`,
          ];
          if (/^\d+$/.test(cleanSearch)) searchParts.push(`numero.eq.${Number(cleanSearch)}`);
          if (salaoSearchIds.length) searchParts.push(`id_salao.in.(${salaoSearchIds.join(",")})`);
          query = query.or(searchParts.join(","));
        }

        return query;
      };

      const [totalResult, openResult, overdueResult, nextResult, unassignedResult] = await Promise.all([
        makeBaseQuery(),
        makeBaseQuery().in("status", OPEN_STATUSES),
        makeBaseQuery().in("status", OPEN_STATUSES).lt("sla_limite_em", nowIso),
        makeBaseQuery().in("status", OPEN_STATUSES).gte("sla_limite_em", nowIso).lte("sla_limite_em", nextFourHoursIso),
        makeBaseQuery().is("id_responsavel_admin", null).in("status", OPEN_STATUSES),
      ]);

      for (const result of [totalResult, openResult, overdueResult, nextResult, unassignedResult]) {
        if (result.error) throw new Error(result.error.message || "Erro ao calcular métricas globais dos tickets.");
      }

      return {
        total: totalResult.count || 0,
        abertos: openResult.count || 0,
        slaVencido: overdueResult.count || 0,
        slaProximo: nextResult.count || 0,
        semResponsavel: unassignedResult.count || 0,
      };
    },
  });
}
