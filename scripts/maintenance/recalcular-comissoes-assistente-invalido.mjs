import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";

loadLocalEnv(process.cwd());
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "x-application-name": "salaopremium-maintenance",
      },
    },
  }
);

const APPLY = process.argv.includes("--apply");
const PAGE_SIZE = 500;

function toNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Number(toNumber(value).toFixed(2));
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function pairKey(item) {
  return [
    item.id_salao || "",
    item.id_profissional || "",
    item.id_assistente || "",
  ].join(":");
}

async function fetchAllCandidateItems() {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("comanda_itens")
      .select(
        "id, id_salao, id_comanda, id_profissional, id_assistente, ativo, comissao_valor_aplicado, comissao_assistente_percentual_aplicada, comissao_assistente_valor_aplicado"
      )
      .eq("ativo", true)
      .or(
        "comissao_assistente_valor_aplicado.gt.0,comissao_assistente_percentual_aplicada.gt.0"
      )
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchActiveAssistantLinks(profissionalIds) {
  const links = new Set();

  for (let index = 0; index < profissionalIds.length; index += PAGE_SIZE) {
    const batch = profissionalIds.slice(index, index + PAGE_SIZE);
    if (batch.length === 0) continue;

    const { data, error } = await supabase
      .from("profissional_assistentes")
      .select("id_salao, id_profissional, id_assistente")
      .eq("ativo", true)
      .in("id_profissional", batch);

    if (error) throw error;

    for (const item of data || []) {
      links.add(pairKey(item));
    }
  }

  return links;
}

async function fetchComandaStatusMap(comandaIds) {
  const map = new Map();

  for (let index = 0; index < comandaIds.length; index += PAGE_SIZE) {
    const batch = comandaIds.slice(index, index + PAGE_SIZE);
    if (batch.length === 0) continue;

    const { data, error } = await supabase
      .from("comandas")
      .select("id, status")
      .in("id", batch);

    if (error) throw error;

    for (const item of data || []) {
      map.set(item.id, normalizeStatus(item.status));
    }
  }

  return map;
}

async function fetchCommissionRows(itemIds) {
  const rows = [];

  for (let index = 0; index < itemIds.length; index += PAGE_SIZE) {
    const batch = itemIds.slice(index, index + PAGE_SIZE);
    if (batch.length === 0) continue;

    const { data, error } = await supabase
      .from("comissoes_lancamentos")
      .select(
        "id, id_comanda_item, id_profissional, id_assistente, status, tipo_destinatario, tipo_profissional, valor_comissao, valor_comissao_assistente"
      )
      .in("id_comanda_item", batch);

    if (error) throw error;
    rows.push(...(data || []));
  }

  return rows;
}

async function fetchAssistantLedgerRows(itemIds) {
  const rows = [];

  for (let index = 0; index < itemIds.length; index += PAGE_SIZE) {
    const batch = itemIds.slice(index, index + PAGE_SIZE);
    if (batch.length === 0) continue;

    const { data, error } = await supabase
      .from("comissoes_assistentes")
      .select("id, id_comanda_item, status")
      .in("id_comanda_item", batch);

    if (error) throw error;
    rows.push(...(data || []));
  }

  return rows;
}

async function updateItem(item) {
  const assistenteValor = roundMoney(item.comissao_assistente_valor_aplicado);
  const novoValorProfissional = roundMoney(
    toNumber(item.comissao_valor_aplicado) + assistenteValor
  );

  const { error } = await supabase
    .from("comanda_itens")
    .update({
      comissao_valor_aplicado: novoValorProfissional,
      comissao_assistente_percentual_aplicada: 0,
      comissao_assistente_valor_aplicado: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("id_salao", item.id_salao);

  if (error) throw error;
}

async function updateProfessionalLaunch(row, item) {
  const assistenteValor = roundMoney(item.comissao_assistente_valor_aplicado);
  const novoValorComissao = roundMoney(toNumber(row.valor_comissao) + assistenteValor);

  const { error } = await supabase
    .from("comissoes_lancamentos")
    .update({
      id_assistente: null,
      valor_comissao: novoValorComissao,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) throw error;
}

async function deleteRows(table, ids) {
  if (!ids.length) return;

  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) throw error;
}

async function main() {
  console.log(
    APPLY
      ? "Aplicando recálculo seguro de comissões com assistente inválido..."
      : "Executando diagnóstico em modo dry-run..."
  );

  const candidateItems = await fetchAllCandidateItems();
  const profissionalIds = Array.from(
    new Set(candidateItems.map((item) => item.id_profissional).filter(Boolean))
  );
  const activeLinks = await fetchActiveAssistantLinks(profissionalIds);

  const invalidItems = candidateItems.filter((item) => {
    if (!item.id_profissional) return false;
    if (!item.id_assistente) return true;
    return !activeLinks.has(pairKey(item));
  });

  const comandaStatusMap = await fetchComandaStatusMap(
    Array.from(new Set(invalidItems.map((item) => item.id_comanda).filter(Boolean)))
  );

  const commissionRows = await fetchCommissionRows(invalidItems.map((item) => item.id));
  const assistantLedgerRows = await fetchAssistantLedgerRows(
    invalidItems.map((item) => item.id)
  );

  const commissionMap = new Map();
  for (const row of commissionRows) {
    const list = commissionMap.get(row.id_comanda_item) || [];
    list.push(row);
    commissionMap.set(row.id_comanda_item, list);
  }

  const assistantLedgerMap = new Map();
  for (const row of assistantLedgerRows) {
    const list = assistantLedgerMap.get(row.id_comanda_item) || [];
    list.push(row);
    assistantLedgerMap.set(row.id_comanda_item, list);
  }

  const summary = {
    candidateItems: candidateItems.length,
    invalidItems: invalidItems.length,
    closedItems: 0,
    openItems: 0,
    safeToApply: 0,
    skippedWithNonPendingHistory: 0,
    skippedWithMultipleProfessionalLaunches: 0,
    pendingProfessionalLaunchesToAdjust: 0,
    pendingAssistantLaunchesToDelete: 0,
    assistantLedgerToDelete: 0,
    paidOrCanceledLaunchesFound: 0,
    appliedItems: 0,
  };

  const safeItems = [];
  const skippedItems = [];

  for (const item of invalidItems) {
    const statusComanda = comandaStatusMap.get(item.id_comanda) || "desconhecido";
    if (statusComanda === "fechada") summary.closedItems += 1;
    else summary.openItems += 1;

    const rows = commissionMap.get(item.id) || [];
    const ledgerRows = assistantLedgerMap.get(item.id) || [];

    const professionalPending = rows.filter((row) => {
      const tipo = normalizeStatus(row.tipo_destinatario || row.tipo_profissional);
      return normalizeStatus(row.status) === "pendente" && tipo !== "assistente";
    });
    const assistantPending = rows.filter((row) => {
      const tipo = normalizeStatus(row.tipo_destinatario || row.tipo_profissional);
      return normalizeStatus(row.status) === "pendente" && tipo === "assistente";
    });
    const nonPending = rows.filter(
      (row) => normalizeStatus(row.status) !== "pendente"
    );
    const ledgerPending = ledgerRows.filter(
      (row) => normalizeStatus(row.status) === "pendente"
    );

    summary.pendingProfessionalLaunchesToAdjust += professionalPending.length;
    summary.pendingAssistantLaunchesToDelete += assistantPending.length;
    summary.assistantLedgerToDelete += ledgerPending.length;
    summary.paidOrCanceledLaunchesFound += nonPending.length;

    if (nonPending.length > 0) {
      summary.skippedWithNonPendingHistory += 1;
      skippedItems.push({
        id: item.id,
        reason: "historico_nao_pendente",
        statusComanda,
      });
      continue;
    }

    if (professionalPending.length > 1) {
      summary.skippedWithMultipleProfessionalLaunches += 1;
      skippedItems.push({
        id: item.id,
        reason: "multiplos_lancamentos_profissional",
        statusComanda,
      });
      continue;
    }

    summary.safeToApply += 1;
    safeItems.push({
      item,
      professionalPending,
      assistantPending,
      ledgerPending,
      statusComanda,
    });
  }

  console.log(JSON.stringify(summary, null, 2));

  if (skippedItems.length > 0) {
    console.log("\nItens pulados para revisao manual:");
    for (const item of skippedItems.slice(0, 20)) {
      console.log(`- ${item.id} | ${item.reason} | comanda=${item.statusComanda}`);
    }
    if (skippedItems.length > 20) {
      console.log(`... e mais ${skippedItems.length - 20} item(ns).`);
    }
  }

  if (!APPLY) {
    return;
  }

  for (const entry of safeItems) {
    await updateItem(entry.item);

    if (entry.professionalPending[0]) {
      await updateProfessionalLaunch(entry.professionalPending[0], entry.item);
    }

    await deleteRows(
      "comissoes_lancamentos",
      entry.assistantPending.map((row) => row.id)
    );
    await deleteRows(
      "comissoes_assistentes",
      entry.ledgerPending.map((row) => row.id)
    );

    summary.appliedItems += 1;
  }

  console.log("\nRecálculo aplicado com sucesso.");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("Falha no recálculo:", error);
  process.exitCode = 1;
});
