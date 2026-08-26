import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button, Card, EmptyState, SearchBox, StatusPill } from "../components/ui";
import { duration, money, shortDate } from "../lib/format";
import { database } from "../lib/database";
import type { AppSession, AnyRow, ModuleKey } from "../types";

export type ResourceConfig = {
  key: ModuleKey;
  title: string;
  subtitle: string;
  table: string;
  select: string;
  tenantField?: string | null;
  searchFields: string[];
  columns: Array<{ key: string; label: string; type?: "money" | "date" | "status" | "duration" }>;
};

export const resourceConfigs: Record<Exclude<ModuleKey, "dashboard" | "agenda" | "caixa" | "configuracoes">, ResourceConfig> = {
  comandas: { key: "comandas", title: "Comandas", subtitle: "Historico e status de atendimento.", table: "comandas", select: "id, numero, status, total, created_at, clientes(nome)", searchFields: ["numero", "clientes.nome", "status"], columns: [{ key: "numero", label: "#" }, { key: "clientes.nome", label: "Cliente" }, { key: "status", label: "Status", type: "status" }, { key: "total", label: "Total", type: "money" }] },
  clientes: { key: "clientes", title: "Clientes", subtitle: "Cadastro, contato e credito.", table: "clientes", select: "id, nome, telefone, whatsapp, email, cashback, created_at", searchFields: ["nome", "telefone", "whatsapp", "email"], columns: [{ key: "nome", label: "Nome" }, { key: "whatsapp", label: "WhatsApp" }, { key: "cashback", label: "Credito", type: "money" }] },
  servicos: { key: "servicos", title: "Servicos", subtitle: "Catalogo do salao.", table: "servicos", select: "id, nome, categoria, preco, preco_padrao, duracao_minutos, ativo, status", searchFields: ["nome", "categoria"], columns: [{ key: "nome", label: "Servico" }, { key: "categoria", label: "Categoria" }, { key: "duracao_minutos", label: "Tempo", type: "duration" }, { key: "preco", label: "Valor", type: "money" }] },
  produtos: { key: "produtos", title: "Produtos", subtitle: "Produtos e estoque comercial.", table: "produtos", select: "id, nome, categoria, preco_venda, estoque_atual, ativo", searchFields: ["nome", "categoria"], columns: [{ key: "nome", label: "Produto" }, { key: "estoque_atual", label: "Estoque" }, { key: "preco_venda", label: "Venda", type: "money" }] },
  profissionais: { key: "profissionais", title: "Profissionais", subtitle: "Equipe, agenda e vinculo de servicos.", table: "profissionais", select: "id, nome, nome_exibicao, cargo, categoria, ativo, status", searchFields: ["nome", "nome_exibicao", "cargo", "categoria"], columns: [{ key: "nome", label: "Nome" }, { key: "cargo", label: "Cargo" }, { key: "status", label: "Status", type: "status" }] },
  estoque: { key: "estoque", title: "Estoque", subtitle: "Movimentacoes recentes.", table: "estoque_movimentacoes", select: "id, tipo_movimento, tipo_item, quantidade, observacoes, criado_em", searchFields: ["tipo_movimento", "tipo_item", "observacoes"], columns: [{ key: "tipo_movimento", label: "Tipo" }, { key: "tipo_item", label: "Item" }, { key: "quantidade", label: "Qtd" }, { key: "criado_em", label: "Data", type: "date" }] },
  comissoes: { key: "comissoes", title: "Comissoes", subtitle: "Comissoes pendentes e pagas.", table: "comissoes_lancamentos", select: "id, descricao, status, valor_comissao, competencia_data, profissionais(nome)", searchFields: ["descricao", "status", "profissionais.nome"], columns: [{ key: "profissionais.nome", label: "Profissional" }, { key: "status", label: "Status", type: "status" }, { key: "valor_comissao", label: "Valor", type: "money" }, { key: "competencia_data", label: "Competencia", type: "date" }] },
  vendas: { key: "vendas", title: "Vendas", subtitle: "Vendas de produtos e servicos.", table: "vw_vendas_busca", select: "id, numero, cliente_nome, status, total, fechada_em, formas_pagamento", searchFields: ["numero", "cliente_nome", "status", "formas_pagamento"], columns: [{ key: "numero", label: "#" }, { key: "cliente_nome", label: "Cliente" }, { key: "status", label: "Status", type: "status" }, { key: "total", label: "Total", type: "money" }] },
  marketing: { key: "marketing", title: "Marketing", subtitle: "Campanhas e disparos.", table: "campanhas", select: "id, nome, status, tipo, criada_em", tenantField: null, searchFields: ["nome", "status", "tipo"], columns: [{ key: "nome", label: "Campanha" }, { key: "tipo", label: "Tipo" }, { key: "status", label: "Status", type: "status" }, { key: "criada_em", label: "Criada", type: "date" }] },
  perfil: { key: "perfil", title: "Perfil do salao", subtitle: "Dados publicos do salao.", table: "saloes", select: "id, nome, responsavel, plano, status", tenantField: "id", searchFields: ["nome", "responsavel"], columns: [{ key: "nome", label: "Salao" }, { key: "responsavel", label: "Responsavel" }, { key: "plano", label: "Plano" }, { key: "status", label: "Status", type: "status" }] },
  assinatura: { key: "assinatura", title: "Assinatura", subtitle: "Plano e situacao financeira.", table: "assinaturas", select: "id, plano, status, vencimento_em, valor, renovacao_automatica", searchFields: ["plano", "status"], columns: [{ key: "plano", label: "Plano" }, { key: "status", label: "Status", type: "status" }, { key: "vencimento_em", label: "Vencimento", type: "date" }, { key: "valor", label: "Valor", type: "money" }] },
  relatorios: { key: "relatorios", title: "Relatorios", subtitle: "Leitura financeira simplificada.", table: "vw_vendas_busca", select: "id, numero, cliente_nome, status, total, fechada_em, profissionais_nomes", searchFields: ["numero", "cliente_nome", "status", "profissionais_nomes"], columns: [{ key: "numero", label: "#" }, { key: "cliente_nome", label: "Cliente" }, { key: "total", label: "Total", type: "money" }, { key: "fechada_em", label: "Fechada", type: "date" }] },
  suporte: { key: "suporte", title: "Suporte", subtitle: "Tickets e chamados.", table: "tickets", select: "id, numero, assunto, status, prioridade, ultima_interacao_em", searchFields: ["numero", "assunto", "status", "prioridade"], columns: [{ key: "numero", label: "#" }, { key: "assunto", label: "Assunto" }, { key: "status", label: "Status", type: "status" }, { key: "prioridade", label: "Prioridade" }] }
};

export function ResourcePage({ session, config }: { session: AppSession; config: ResourceConfig }) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      let request = database.from(config.table).select(config.select).limit(120);
      const tenantField = config.tenantField === undefined ? "id_salao" : config.tenantField;
      if (tenantField) request = request.eq(tenantField, session.usuario.id_salao);
      const { data, error } = await request;
      if (error) throw error;
      setRows((data || []) as unknown as AnyRow[]);
    } catch (error) {
      setErro(error instanceof Error ? error.message : `Nao foi possivel carregar ${config.title}.`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config.select, config.table, config.tenantField, config.title, session.usuario.id_salao]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => config.searchFields.some((field) => String(getValue(row, field) || "").toLowerCase().includes(term)));
  }, [config.searchFields, query, rows]);
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-black tracking-[-0.05em]">{config.title}</h2><p className="text-sm font-bold text-zinc-500">{config.subtitle}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void load()}><RefreshCw size={16} />Atualizar</Button>{["clientes", "servicos", "produtos", "profissionais"].includes(config.key) ? <Button><Plus size={16} />Novo</Button> : null}</div></div>
        <div className="mt-4"><SearchBox value={query} onChange={setQuery} placeholder={`Buscar em ${config.title.toLowerCase()}`} /></div>
      </Card>
      {erro ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{erro}</div> : null}
      <Card className="overflow-hidden p-0">
        <div className="overflow-auto thin-scrollbar"><table className="min-w-full text-left text-sm"><thead className="bg-zinc-50 text-xs font-black uppercase tracking-[0.14em] text-zinc-400"><tr>{config.columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr key={String(row.id)} className="border-t border-zinc-100">{config.columns.map((column) => <td key={column.key} className="px-4 py-3 font-bold text-zinc-700">{renderValue(getValue(row, column.key), column.type)}</td>)}</tr>)}</tbody></table></div>
        {loading ? <div className="p-4"><EmptyState title="Carregando" message="Buscando dados do Neon." /></div> : null}
        {!loading && !filtered.length ? <div className="p-4"><EmptyState title="Sem registros" message="Nada encontrado para essa tela." /></div> : null}
      </Card>
    </div>
  );
}

function renderValue(value: unknown, type?: ResourceConfig["columns"][number]["type"]) {
  if (type === "money") return money(Number(value || 0));
  if (type === "date") return shortDate(String(value || ""));
  if (type === "status") return <StatusPill status={String(value || "-")} />;
  if (type === "duration") return duration(Number(value || 0));
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  return String(value ?? "-");
}

function getValue(row: AnyRow, key: string) {
  return key.split(".").reduce<unknown>((current, part) => {
    if (Array.isArray(current)) return (current[0] as AnyRow | undefined)?.[part];
    if (current && typeof current === "object") return (current as AnyRow)[part];
    return undefined;
  }, row);
}
