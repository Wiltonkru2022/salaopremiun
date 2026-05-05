import { unstable_cache } from "next/cache";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

type ComissaoResumoRow = {
  valor_comissao?: number | string | null;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function hojeLocalISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function inicioMesISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
}

function fimMesISO() {
  const now = new Date();
  const fimDoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${fimDoMes.getFullYear()}-${pad(fimDoMes.getMonth() + 1)}-${pad(
    fimDoMes.getDate()
  )}`;
}

export async function buscarResumoInicioProfissional(
  idSalao: string,
  idProfissional: string
) {
  const hoje = hojeLocalISO();
  const inicioMes = inicioMesISO();
  const fimMes = fimMesISO();

  const getCachedResumoInicio = unstable_cache(
    async (
      cachedSalaoId: string,
      cachedProfissionalId: string,
      cachedHoje: string,
      cachedInicioMes: string,
      cachedFimMes: string
    ) =>
      runAdminOperation({
        action: "profissional_resumo_inicio",
        actorId: cachedProfissionalId,
        idSalao: cachedSalaoId,
        run: async (supabaseAdmin) => {
          const [hojeResult, mesResult, comissoesResult] = await Promise.all([
            supabaseAdmin
              .from("agendamentos")
              .select("id", { count: "exact", head: true })
              .eq("id_salao", cachedSalaoId)
              .eq("profissional_id", cachedProfissionalId)
              .eq("data", cachedHoje),
            supabaseAdmin
              .from("agendamentos")
              .select("id", { count: "exact", head: true })
              .eq("id_salao", cachedSalaoId)
              .eq("profissional_id", cachedProfissionalId)
              .gte("data", cachedInicioMes)
              .lte("data", cachedFimMes),
            supabaseAdmin
              .from("comissoes_lancamentos")
              .select("valor_comissao")
              .eq("id_salao", cachedSalaoId)
              .eq("id_profissional", cachedProfissionalId)
              .gte("competencia_data", cachedInicioMes)
              .lte("competencia_data", cachedFimMes),
          ]);

          if (hojeResult.error) {
            console.error(
              "[profissional_resumo] Falha ao contar atendimentos de hoje:",
              hojeResult.error.message
            );
          }

          if (mesResult.error) {
            console.error(
              "[profissional_resumo] Falha ao contar atendimentos do mes:",
              mesResult.error.message
            );
          }

          if (comissoesResult.error) {
            console.error(
              "[profissional_resumo] Falha ao carregar comissoes:",
              comissoesResult.error.message
            );
          }

          if (hojeResult.error && mesResult.error && comissoesResult.error) {
            throw new Error(
              "Nao foi possivel carregar o resumo inicial do profissional."
            );
          }

          const totalComissaoMes = (
            ((comissoesResult.data ?? []) as ComissaoResumoRow[]) || []
          ).reduce((acc, item) => acc + Number(item.valor_comissao || 0), 0);

          return {
            atendimentosHoje: hojeResult.count ?? 0,
            atendimentosMes: mesResult.count ?? 0,
            totalComissaoMes,
          };
        },
      }),
    ["profissional-inicio-resumo"],
    {
      revalidate: 30,
    }
  );

  return getCachedResumoInicio(
    idSalao,
    idProfissional,
    hoje,
    inicioMes,
    fimMes
  );
}
