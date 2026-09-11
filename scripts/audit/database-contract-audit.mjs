import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const migrationsDir = path.join(cwd, "supabase", "migrations");

const REQUIRED_TABLES = [
  "admin_master_usuarios",
  "agenda_bloqueios",
  "agenda_bloqueios_logs",
  "agendamentos",
  "alertas_sistema",
  "asaas_webhook_eventos",
  "assinaturas",
  "assinaturas_cobrancas",
  "clientes",
  "comandas",
  "eventos_webhook",
  "logs_sistema",
  "planos_saas",
  "produtos",
  "profissionais",
  "servicos",
  "tickets",
  "usuarios",
];

const REQUIRED_FUNCTION_GROUPS = [
  ["cadastro_salao", ["fn_cadastrar_salao_transacional"]],
  ["servico_salvar", ["fn_salvar_servico_catalogo_transacional"]],
  ["servico_categoria", ["fn_get_or_create_servico_categoria"]],
  ["servico_excluir", ["fn_excluir_servico_catalogo"]],
  ["produto_excluir", ["fn_excluir_produto_catalogo"]],
  ["caixa_abrir", ["fn_caixa_abrir_sessao"]],
  ["caixa_fechar", ["fn_caixa_fechar_sessao"]],
  ["caixa_movimento", ["fn_caixa_lancar_movimentacao_idempotente", "fn_caixa_lancar_movimentacao_v2"]],
  ["caixa_pagamento_add", ["fn_caixa_adicionar_pagamento_comanda_idempotente", "fn_caixa_adicionar_pagamento_v2"]],
  ["caixa_pagamento_remover", ["fn_caixa_remover_pagamento_comanda", "fn_caixa_remover_pagamento"]],
  ["caixa_finalizar_comanda", ["fn_caixa_finalizar_comanda"]],
  ["caixa_cancelar_comanda", ["fn_caixa_cancelar_comanda"]],
  ["comanda_base", ["fn_salvar_comanda_base"]],
  ["comanda_por_agendamento", ["fn_criar_comanda_por_agendamento"]],
  ["comanda_item_add", ["fn_adicionar_item_comanda_idempotente", "fn_adicionar_item_comanda"]],
  ["comanda_item_update", ["fn_atualizar_item_comanda"]],
  ["comanda_item_remove", ["fn_remover_item_comanda"]],
  ["comanda_enviar_pagamento", ["fn_enviar_comanda_para_pagamento"]],
  ["estoque_aplicar_comanda", ["fn_aplicar_estoque_comanda", "fn_aplicar_estoque_comanda_atomic", "fn_processar_estoque_comanda_atomic"]],
  ["estoque_reverter_comanda", ["fn_reverter_estoque_comanda", "fn_reverter_estoque_comanda_atomic"]],
  ["venda_detalhes", ["fn_detalhes_venda"]],
  ["venda_reabrir", ["fn_reabrir_venda_para_caixa"]],
  ["venda_excluir", ["fn_excluir_venda_completa"]],
  ["required_functions_healthcheck", ["fn_validar_funcoes_obrigatorias"]],
];

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, predicate);
    return predicate(full) ? [full] : [];
  });
}

function readAll(files) {
  return files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
}

function includesIdentifier(source, identifier) {
  return new RegExp(`\\b${identifier}\\b`, "i").test(source);
}

function findRpcCalls() {
  const files = walk(cwd, (file) => {
    if (file.includes(`${path.sep}node_modules${path.sep}`)) return false;
    if (file.includes(`${path.sep}.next${path.sep}`)) return false;
    return /\.(ts|tsx|mjs)$/.test(file);
  });

  const calls = new Map();

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g)) {
      const name = match[1];
      const rel = path.relative(cwd, file).replaceAll(path.sep, "/");
      const list = calls.get(name) ?? [];
      list.push(rel);
      calls.set(name, list);
    }
  }

  return calls;
}

const migrationFiles = walk(migrationsDir, (file) => file.endsWith(".sql")).sort();
const migrationSource = readAll(migrationFiles);

const missingTables = REQUIRED_TABLES.filter(
  (table) => !includesIdentifier(migrationSource, table)
);

const missingFunctionGroups = REQUIRED_FUNCTION_GROUPS.filter(([, alternatives]) =>
  alternatives.every((fn) => !includesIdentifier(migrationSource, fn))
).map(([group, alternatives]) => ({ group, alternatives }));

const rpcCalls = findRpcCalls();
const rpcWithoutMigration = Array.from(rpcCalls.entries())
  .filter(([name]) => !includesIdentifier(migrationSource, name))
  .map(([name, files]) => ({ name, files }));

const result = {
  ok:
    missingTables.length === 0 &&
    missingFunctionGroups.length === 0 &&
    rpcWithoutMigration.length === 0,
  migrations: migrationFiles.length,
  requiredTables: REQUIRED_TABLES.length,
  requiredFunctionGroups: REQUIRED_FUNCTION_GROUPS.length,
  rpcCalls: rpcCalls.size,
  missingTables,
  missingFunctionGroups,
  rpcWithoutMigration,
};

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
