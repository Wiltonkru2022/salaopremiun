import { getDatabaseAdmin } from "@/lib/db/admin";

export type AdminWhatsappTarifaRow = {
  id: string;
  tipoInterno: string;
  categoriaMeta: string;
  nome: string;
  descricao: string;
  custoBaseMetaCentavos: number;
  precoVendaCentavos: number;
  margemCentavos: number;
  ativo: boolean;
  atualizadoEm: string;
};

export type AdminWhatsappSaldoRow = {
  idSalao: string;
  salaoNome: string;
  plano: string;
  status: string;
  saldoCentavos: number;
  totalRecarregadoCentavos: number;
  totalConsumidoCentavos: number;
  alertaSaldoBaixoCentavos: number;
};

export type AdminWhatsappSalaoOption = {
  id: string;
  nome: string;
};

function cents(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

export async function getAdminWhatsappCreditosData() {
  const database = getDatabaseAdmin();

  const [{ data: tarifas }, { data: saldos }, { data: saloesOptions }] =
    await Promise.all([
      database
        .from("whatsapp_tarifas")
        .select(
          "id, tipo_interno, categoria_meta, nome, descricao, custo_base_meta_centavos, preco_venda_centavos, margem_centavos, ativo, atualizado_em, ordem"
        )
        .order("ordem", { ascending: true }),
      database
        .from("whatsapp_creditos_saloes")
        .select(
          "id_salao, saldo_centavos, total_recarregado_centavos, total_consumido_centavos, alerta_saldo_baixo_centavos"
        )
        .order("saldo_centavos", { ascending: true })
        .limit(120),
      database
        .from("saloes")
        .select("id, nome")
        .order("nome", { ascending: true })
        .limit(300),
    ]);

  const saldoRows = (saldos || []) as Array<Record<string, unknown>>;
  const saldoSalaoIds = saldoRows
    .map((row) => String(row.id_salao || ""))
    .filter(Boolean);

  const { data: saloesSaldo } = saldoSalaoIds.length
    ? await database
        .from("saloes")
        .select("id, nome, plano, status")
        .in("id", saldoSalaoIds)
    : { data: [] };

  const saloesById = new Map(
    ((saloesSaldo || []) as Array<Record<string, unknown>>).map((salao) => [
      String(salao.id),
      salao,
    ])
  );

  const tarifasRows: AdminWhatsappTarifaRow[] = (
    (tarifas || []) as Array<Record<string, unknown>>
  ).map((row) => ({
    id: String(row.id),
    tipoInterno: String(row.tipo_interno || ""),
    categoriaMeta: String(row.categoria_meta || ""),
    nome: String(row.nome || ""),
    descricao: String(row.descricao || ""),
    custoBaseMetaCentavos: cents(row.custo_base_meta_centavos),
    precoVendaCentavos: cents(row.preco_venda_centavos),
    margemCentavos: cents(row.margem_centavos),
    ativo: row.ativo !== false,
    atualizadoEm: String(row.atualizado_em || ""),
  }));

  const saldosRows: AdminWhatsappSaldoRow[] = saldoRows.map((row) => {
    const idSalao = String(row.id_salao || "");
    const salao = saloesById.get(idSalao);

    return {
      idSalao,
      salaoNome: String(salao?.nome || idSalao),
      plano: String(salao?.plano || "-"),
      status: String(salao?.status || "-"),
      saldoCentavos: cents(row.saldo_centavos),
      totalRecarregadoCentavos: cents(row.total_recarregado_centavos),
      totalConsumidoCentavos: cents(row.total_consumido_centavos),
      alertaSaldoBaixoCentavos: cents(row.alerta_saldo_baixo_centavos),
    };
  });

  return {
    tarifas: tarifasRows,
    saldos: saldosRows,
    saloesOptions: ((saloesOptions || []) as Array<Record<string, unknown>>).map(
      (salao) => ({
        id: String(salao.id),
        nome: String(salao.nome || salao.id),
      })
    ),
  };
}
