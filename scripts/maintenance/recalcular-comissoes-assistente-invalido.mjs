import { neon } from "@neondatabase/serverless";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";

loadLocalEnv(process.cwd());
requireEnv(["NEON_ADMIN_DATABASE_URL"]);

const sql = neon(process.env.NEON_ADMIN_DATABASE_URL);
const APPLY = process.argv.includes("--apply");
const PAGE_SIZE = 500;

async function query(text, params = []) {
  return sql.query(text, params, { arrayMode: false, fullResults: false });
}

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
  return [item.id_salao || "", item.id_profissional || "", item.id_assistente || ""].join(":");
}

async function fetchAllCandidateItems() {
  const rows = [];
  let offset = 0;
  while (true) {
    const data = await query(
      `select id, id_salao, id_comanda, id_profissional, id_assistente, ativo,
              comissao_valor_aplicado, comissao_assistente_percentual_aplicada,
              comissao_assistente_valor_aplicado
         from public.comanda_itens
        where ativo = true
          and (coalesce(comissao_assistente_valor_aplicado, 0) > 0
            or coalesce(comissao_assistente_percentual_aplicada, 0) > 0)
        order by id asc
        limit $1 offset $2`,
      [PAGE_SIZE, offset]
    );
    if (!data.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function fetchActiveAssistantLinks(profissionalIds) {
  if (!profissionalIds.length) return new Set();
  const rows = await query(
    `select id_salao, id_profissional, id_assistente
       from public.profissional_assistentes
      where ativo = true and id_profissional = any($1::uuid[])`,
    [profissionalIds]
  );
  return new Set(rows.map(pairKey));
}

async function fetchComandaStatusMap(comandaIds) {
  const map = new Map();
  if (!comandaIds.length) return map;
  const rows = await query(
    `select id, status from public.comandas where id = any($1::uuid[])`,
    [comandaIds]
  );
  for (const item of rows) map.set(item.id, normalizeStatus(item.status));
  return map;
}

async function fetchCommissionRows(itemIds) {
  if (!itemIds.length) return [];
  return query(
    `select id, id_comanda_item, id_profissional, id_assistente, status,
            tipo_destinatario, tipo_profissional, valor_comissao, valor_comissao_assistente
       from public.comissoes_lancamentos
      where id_comanda_item = any($1::uuid[])`,
    [itemIds]
  );
}

async function fetchAssistantLedgerRows(itemIds) {
  if (!itemIds.length) return [];
  return query(
    `select id, id_comanda_item, status
       from public.comissoes_assistentes
      where id_comanda_item = any($1::uuid[])`,
    [itemIds]
  );
}

async function updateItem(item) {
  const assistenteValor = roundMoney(item.comissao_assistente_valor_aplicado);
  const novoValorProfissional = roundMoney(toNumber(item.comissao_valor_aplicado) + assistenteValor);
  await query(
    `update public.comanda_itens
        set comissao_valor_aplicado = $1,
            comissao_assistente_percentual_aplicada = 0,
            comissao_assistente_valor_aplicado = 0,
            updated_at = now()
      where id = $2 and id_salao = $3`,
    [novoValorProfissional, item.id, item.id_salao]
  );
}

async function updateProfessionalLaunch(row, item) {
  const assistenteValor = roundMoney(item.comissao_assistente_valor_aplicado);
  const novoValorComissao = roundMoney(toNumber(row.valor_comissao) + assistenteValor);
  await query(
    `update public.comissoes_lancamentos
        set id_assistente = null, valor_comissao = $1, updated_at = now()
      where id = $2`,
    [novoValorComissao, row.id]
  );
}

async function deleteRows(table, ids) {
  if (!ids.length) return;
  if (!new Set(["comissoes_lancamentos", "comissoes_assistentes"]).has(table)) {
    throw new Error(`Tabela de manutencao nao permitida: ${table}`);
  }
  await query(`delete from public.${table} where id = any($1::uuid[])`, [ids]);
}

async function main() {
  console.log(
    APPLY
      ? "Aplicando recálculo seguro de comissões com assistente inválido..."
      : "Executando diagnóstico em modo dry-run..."
  );

  const candidateItems = await fetchAllCandidateItems();
  const profissionalIds = Array.from(new Set(candidateItems.map((item) => item.id_profissional).filter(Boolean)));
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
  const assistantLedgerRows = await fetchAssistantLedgerRows(invalidItems.map((item) => item.id));

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
    const nonPending = rows.filter((row) => normalizeStatus(row.status) !== "pendente");
    const ledgerPending = ledgerRows.filter((row) => normalizeStatus(row.status) === "pendente");

    summary.pendingProfessionalLaunchesToAdjust += professionalPending.length;
    summary.pendingAssistantLaunchesToDelete += assistantPending.length;
    summary.assistantLedgerToDelete += ledgerPending.length;
    summary.paidOrCanceledLaunchesFound += nonPending.length;

    if (nonPending.length > 0) {
      summary.skippedWithNonPendingHistory += 1;
      skippedItems.push({ id: item.id, reason: "historico_nao_pendente", statusComanda });
      continue;
    }
    if (professionalPending.length > 1) {
      summary.skippedWithMultipleProfessionalLaunches += 1;
      skippedItems.push({ id: item.id, reason: "multiplos_lancamentos_profissional", statusComanda });
      continue;
    }

    summary.safeToApply += 1;
    safeItems.push({ item, professionalPending, assistantPending, ledgerPending, statusComanda });
  }

  console.log(JSON.stringify(summary, null, 2));
  if (skippedItems.length > 0) {
    console.log("\nItens pulados para revisao manual:");
    for (const item of skippedItems.slice(0, 20)) {
      console.log(`- ${item.id} | ${item.reason} | comanda=${item.statusComanda}`);
    }
    if (skippedItems.length > 20) console.log(`... e mais ${skippedItems.length - 20} item(ns).`);
  }
  if (!APPLY) return;

  for (const entry of safeItems) {
    await updateItem(entry.item);
    if (entry.professionalPending[0]) await updateProfessionalLaunch(entry.professionalPending[0], entry.item);
    await deleteRows("comissoes_lancamentos", entry.assistantPending.map((row) => row.id));
    await deleteRows("comissoes_assistentes", entry.ledgerPending.map((row) => row.id));
    summary.appliedItems += 1;
  }

  console.log("\nRecálculo aplicado com sucesso.");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("Falha no recálculo:", error);
  process.exitCode = 1;
});
