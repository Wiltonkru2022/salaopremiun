import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

export type AdminMasterSearchResult = {
  id: string;
  type: "salao" | "cobranca" | "ticket" | "webhook" | "admin" | "plano";
  title: string;
  subtitle: string;
  href: string;
};

export function createAdminMasterSearchService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    async buscar(query: string): Promise<AdminMasterSearchResult[]> {
      const like = `%${query}%`;
      const numericQuery = Number(query);
      const hasNumericQuery = Number.isFinite(numericQuery) && numericQuery > 0;

      const [
        { data: saloes },
        { data: cobrancas },
        { data: tickets },
        { data: webhooks },
        { data: admins },
        { data: planos },
      ] = await runAdminOperation({
        action: "admin_master_search_buscar",
        run: async (supabase) =>
          Promise.all([
            supabase
              .from("saloes")
              .select("id, nome, responsavel, email, status")
              .or(
                `nome.ilike.${like},responsavel.ilike.${like},email.ilike.${like}`
              )
              .limit(5),
            supabase
              .from("assinaturas_cobrancas")
              .select("id, referencia, descricao, status, valor, id_salao")
              .or(
                `referencia.ilike.${like},descricao.ilike.${like},asaas_payment_id.ilike.${like},txid.ilike.${like}`
              )
              .limit(5),
            hasNumericQuery
              ? supabase
                  .from("tickets")
                  .select("id, numero, assunto, status, id_salao")
                  .or(`numero.eq.${numericQuery},assunto.ilike.${like}`)
                  .limit(5)
              : supabase
                  .from("tickets")
                  .select("id, numero, assunto, status, id_salao")
                  .or(`assunto.ilike.${like},categoria.ilike.${like}`)
                  .limit(5),
            supabase
              .from("eventos_webhook")
              .select("id, evento, status, origem, id_salao")
              .or(
                `evento.ilike.${like},origem.ilike.${like},status.ilike.${like}`
              )
              .limit(5),
            supabase
              .from("admin_master_usuarios")
              .select("id, nome, email, perfil, status")
              .or(`nome.ilike.${like},email.ilike.${like},perfil.ilike.${like}`)
              .limit(5),
            supabase
              .from("planos_saas")
              .select("id, codigo, nome, subtitulo, ativo")
              .or(
                `codigo.ilike.${like},nome.ilike.${like},subtitulo.ilike.${like}`
              )
              .limit(5),
          ]),
      });

      return [
        ...((saloes || []) as {
          id?: string | null;
          nome?: string | null;
          responsavel?: string | null;
          email?: string | null;
          status?: string | null;
        }[]).map((item) => ({
          id: String(item.id || ""),
          type: "salao" as const,
          title: item.nome || "Salao sem nome",
          subtitle: `${item.responsavel || "-"} / ${item.email || "-"} / ${item.status || "-"}`,
          href: `/admin-master/saloes/${item.id}`,
        })),
        ...((cobrancas || []) as {
          id?: string | null;
          referencia?: string | null;
          descricao?: string | null;
          status?: string | null;
          valor?: string | number | null;
          id_salao?: string | null;
        }[]).map((item) => ({
          id: String(item.id || ""),
          type: "cobranca" as const,
          title: item.referencia || `Cobranca ${item.id || ""}`,
          subtitle: `${item.descricao || "-"} / ${item.status || "-"} / Salao ${item.id_salao || "-"}`,
          href: `/admin-master/assinaturas/cobrancas?referencia=${encodeURIComponent(
            item.referencia || String(item.id || "")
          )}`,
        })),
        ...((tickets || []) as {
          id?: string | null;
          numero?: string | number | null;
          assunto?: string | null;
          status?: string | null;
          id_salao?: string | null;
        }[]).map((item) => ({
          id: String(item.id || ""),
          type: "ticket" as const,
          title: `#${item.numero || "-"} ${item.assunto || "Ticket"}`,
          subtitle: `${item.status || "-"} / Salao ${item.id_salao || "-"}`,
          href: `/admin-master/tickets/${item.id}`,
        })),
        ...((webhooks || []) as {
          id?: string | null;
          evento?: string | null;
          status?: string | null;
          origem?: string | null;
          id_salao?: string | null;
        }[]).map((item) => ({
          id: String(item.id || ""),
          type: "webhook" as const,
          title: item.evento || "Webhook",
          subtitle: `${item.origem || "-"} / ${item.status || "-"} / Salao ${item.id_salao || "-"}`,
          href: "/admin-master/webhooks",
        })),
        ...((admins || []) as {
          id?: string | null;
          nome?: string | null;
          email?: string | null;
          perfil?: string | null;
          status?: string | null;
        }[]).map((item) => ({
          id: String(item.id || ""),
          type: "admin" as const,
          title: item.nome || "Admin interno",
          subtitle: `${item.email || "-"} / ${item.perfil || "-"} / ${item.status || "-"}`,
          href: "/admin-master/usuarios-admin",
        })),
        ...((planos || []) as {
          id?: string | null;
          codigo?: string | null;
          nome?: string | null;
          subtitulo?: string | null;
          ativo?: boolean | null;
        }[]).map((item) => ({
          id: String(item.id || ""),
          type: "plano" as const,
          title: item.nome || item.codigo || "Plano",
          subtitle: `${item.codigo || "-"} / ${item.subtitulo || "-"} / ${
            item.ativo ? "ativo" : "inativo"
          }`,
          href: `/admin-master/planos/${item.id}`,
        })),
      ].filter((item) => item.id);
    },
  };
}

export type AdminMasterSearchService = ReturnType<
  typeof createAdminMasterSearchService
>;
