import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PainelSearchResult = {
  id: string;
  type: "cliente" | "agendamento" | "comanda" | "servico";
  title: string;
  description: string;
  href: string;
};

type PainelSearchPermissions = {
  clientes: boolean;
  servicos: boolean;
  agenda: boolean;
  comandas: boolean;
};

export function normalizeSearchTerm(value: string | null) {
  return String(value || "")
    .replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const buscarPainelGlobalCached = unstable_cache(
  async (params: {
    idSalao: string;
    term: string;
    permissions: PainelSearchPermissions;
  }) => {
    const admin = getSupabaseAdmin() as any;
    const { data, error } = await admin.rpc("fn_painel_busca_global", {
      p_id_salao: params.idSalao,
      p_term: params.term,
      p_clientes: params.permissions.clientes,
      p_servicos: params.permissions.servicos,
      p_agenda: params.permissions.agenda,
      p_comandas: params.permissions.comandas,
    });

    if (error) throw error;

    return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id || ""),
      type: String(row.type || "cliente") as PainelSearchResult["type"],
      title: String(row.title || ""),
      description: String(row.description || ""),
      href: String(row.href || "/dashboard"),
    })) satisfies PainelSearchResult[];
  },
  ["painel-busca-global-rpc-v1"],
  { revalidate: 15, tags: ["painel-busca-global"] }
);

export async function buscarPainelGlobal(params: {
  idSalao: string;
  term: string;
  permissions: PainelSearchPermissions;
}) {
  return buscarPainelGlobalCached({
    ...params,
    term: normalizeSearchTerm(params.term),
  });
}
