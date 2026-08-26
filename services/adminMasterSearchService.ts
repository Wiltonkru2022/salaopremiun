import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";
import { runAdminOperation } from "@/lib/db/admin-ops";

export type AdminMasterSearchResultAction = {
  label: string;
  href: string;
};

export type AdminMasterSearchResult = {
  id: string;
  type: "salao" | "cliente" | "parceiro" | "cobranca" | "ticket" | "webhook" | "admin" | "plano";
  title: string;
  subtitle: string;
  href: string;
  actions?: AdminMasterSearchResultAction[];
};

export function createAdminMasterSearchService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    async buscar(query: string): Promise<AdminMasterSearchResult[]> {
      const cleanQuery = String(query || "").replace(/[,%()]/g, " ").trim().slice(0, 80);
      const like = `%${cleanQuery}%`;
      const numericQuery = Number(cleanQuery);
      const hasNumericQuery = Number.isFinite(numericQuery) && numericQuery > 0;

      const [
        { data: saloes },
        { data: clientes },
        { data: parceiros },
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
              .or(`nome.ilike.${like},responsavel.ilike.${like},email.ilike.${like}`)
              .limit(5),
            supabase
              .from("clientes")
              .select("id, id_salao, nome, email, whatsapp, telefone, status")
              .or(`nome.ilike.${like},email.ilike.${like},whatsapp.ilike.${like},telefone.ilike.${like}`)
              .limit(5),
            (supabase as any)
              .from("parceiros_comerciais")
              .select("id, razao_social, nome_fantasia, segmento, cidade, uf, status, email, whatsapp")
              .or(`razao_social.ilike.${like},nome_fantasia.ilike.${like},segmento.ilike.${like},email.ilike.${like},whatsapp.ilike.${like}`)
              .limit(5),
            supabase
              .from("assinaturas_cobrancas")
              .select("id, referencia, descricao, status, valor, id_salao")
              .or(`referencia.ilike.${like},descricao.ilike.${like},asaas_payment_id.ilike.${like},txid.ilike.${like}`)
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
              .or(`evento.ilike.${like},origem.ilike.${like},status.ilike.${like}`)
              .limit(5),
            supabase
              .from("admin_master_usuarios")
              .select("id, nome, email, perfil, status")
              .or(`nome.ilike.${like},email.ilike.${like},perfil.ilike.${like}`)
              .limit(5),
            supabase
              .from("planos_saas")
              .select("id, codigo, nome, subtitulo, ativo")
              .or(`codigo.ilike.${like},nome.ilike.${like},subtitulo.ilike.${like}`)
              .limit(5),
          ]),
      });

      return [
        ...((saloes || []) as Array<{ id?: string | null; nome?: string | null; responsavel?: string | null; email?: string | null; status?: string | null }>).map((item) => ({
          id: String(item.id || ""),
          type: "salao" as const,
          title: item.nome || "Salão sem nome",
          subtitle: `${item.responsavel || "-"} / ${item.email || "-"} / ${item.status || "-"}`,
          href: `/admin-master/saloes/${item.id}`,
          actions: [
            { label: "Abrir salão", href: `/admin-master/saloes/${item.id}` },
            { label: "Cobrança", href: `/admin-master/saloes/${item.id}?tab=assinatura` },
          ],
        })),
        ...((clientes || []) as Array<{ id?: string | null; id_salao?: string | null; nome?: string | null; email?: string | null; whatsapp?: string | null; telefone?: string | null; status?: string | null }>).map((item) => ({
          id: String(item.id || ""),
          type: "cliente" as const,
          title: item.nome || "Cliente sem nome",
          subtitle: `${item.whatsapp || item.telefone || item.email || "Sem contato"} / ${item.status || "-"}`,
          href: `/admin-master/clientes/${item.id}`,
          actions: [
            { label: "Ver cliente", href: `/admin-master/clientes/${item.id}` },
            ...(item.id_salao ? [{ label: "Abrir salão", href: `/admin-master/saloes/${item.id_salao}` }] : []),
          ],
        })),
        ...((parceiros || []) as Array<{ id?: string | null; razao_social?: string | null; nome_fantasia?: string | null; segmento?: string | null; cidade?: string | null; uf?: string | null; status?: string | null; email?: string | null; whatsapp?: string | null }>).map((item) => ({
          id: String(item.id || ""),
          type: "parceiro" as const,
          title: item.nome_fantasia || item.razao_social || "Empresa parceira",
          subtitle: `${item.segmento || "Sem segmento"} / ${[item.cidade, item.uf].filter(Boolean).join("-") || "Sem local"} / ${item.status || "-"}`,
          href: "/admin-master/parcerias#empresas",
          actions: [{ label: "Abrir parceria", href: "/admin-master/parcerias#empresas" }],
        })),
        ...((cobrancas || []) as Array<{ id?: string | null; referencia?: string | null; descricao?: string | null; status?: string | null; valor?: string | number | null; id_salao?: string | null }>).map((item) => ({
          id: String(item.id || ""),
          type: "cobranca" as const,
          title: item.referencia || `Cobrança ${item.id || ""}`,
          subtitle: `${item.descricao || "-"} / ${item.status || "-"} / Salão ${item.id_salao || "-"}`,
          href: `/admin-master/assinaturas/cobrancas?referencia=${encodeURIComponent(item.referencia || String(item.id || ""))}`,
          actions: item.id_salao ? [{ label: "Abrir salão", href: `/admin-master/saloes/${item.id_salao}?tab=assinatura` }] : undefined,
        })),
        ...((tickets || []) as Array<{ id?: string | null; numero?: string | number | null; assunto?: string | null; status?: string | null; id_salao?: string | null }>).map((item) => ({
          id: String(item.id || ""),
          type: "ticket" as const,
          title: `#${item.numero || "-"} ${item.assunto || "Ticket"}`,
          subtitle: `${item.status || "-"} / Salão ${item.id_salao || "-"}`,
          href: `/admin-master/tickets/${item.id}`,
        })),
        ...((webhooks || []) as Array<{ id?: string | null; evento?: string | null; status?: string | null; origem?: string | null; id_salao?: string | null }>).map((item) => ({
          id: String(item.id || ""),
          type: "webhook" as const,
          title: item.evento || "Webhook",
          subtitle: `${item.origem || "-"} / ${item.status || "-"} / Salão ${item.id_salao || "-"}`,
          href: "/admin-master/webhooks",
        })),
        ...((admins || []) as Array<{ id?: string | null; nome?: string | null; email?: string | null; perfil?: string | null; status?: string | null }>).map((item) => ({
          id: String(item.id || ""),
          type: "admin" as const,
          title: item.nome || "Admin interno",
          subtitle: `${item.email || "-"} / ${item.perfil || "-"} / ${item.status || "-"}`,
          href: "/admin-master/usuarios-admin",
        })),
        ...((planos || []) as Array<{ id?: string | null; codigo?: string | null; nome?: string | null; subtitulo?: string | null; ativo?: boolean | null }>).map((item) => ({
          id: String(item.id || ""),
          type: "plano" as const,
          title: item.nome || item.codigo || "Plano",
          subtitle: `${item.codigo || "-"} / ${item.subtitulo || "-"} / ${item.ativo ? "ativo" : "inativo"}`,
          href: `/admin-master/planos/${item.id}`,
        })),
      ].filter((item) => item.id) as AdminMasterSearchResult[];
    },
  };
}

export type AdminMasterSearchService = ReturnType<
  typeof createAdminMasterSearchService
>;
