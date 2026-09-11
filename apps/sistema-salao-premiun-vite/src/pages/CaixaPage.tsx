import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Coins,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet
} from "lucide-react";
import { Button, Card, EmptyState, Field, Input, Modal, SearchBox, StatusPill, Textarea } from "../components/ui";
import { duration, money, shortDate, time } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { AppSession, AnyRow } from "../types";

type Aba = "fila" | "agenda" | "fechadas" | "canceladas";
type Comanda = AnyRow & { id: string; numero?: number | null; status: string; id_cliente?: string | null; subtotal?: number | null; desconto?: number | null; acrescimo?: number | null; total?: number | null };
type Item = AnyRow & { id: string; id_comanda: string; tipo_item: string; descricao: string; quantidade: number; valor_unitario: number; valor_total: number; ativo?: boolean | null };
type Pagamento = AnyRow & { id: string; forma_pagamento: string; valor: number; parcelas?: number | null; valor_troco?: number | null; valor_credito_cliente?: number | null };
type CatalogItem = AnyRow & { id: string; nome: string; preco?: number | null; preco_venda?: number | null; valor?: number | null; duracao_minutos?: number | null };

const formasPagamento = ["pix", "dinheiro", "debito", "credito", "transferencia", "boleto", "credito_cliente", "outro"];

export function CaixaPage({ session }: { session: AppSession }) {
  const idSalao = session.usuario.id_salao;
  const [aba, setAba] = useState<Aba>("fila");
  const [query, setQuery] = useState("");
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [agendamentos, setAgendamentos] = useState<AnyRow[]>([]);
  const [selected, setSelected] = useState<Comanda | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [clientes, setClientes] = useState<CatalogItem[]>([]);
  const [servicos, setServicos] = useState<CatalogItem[]>([]);
  const [produtos, setProdutos] = useState<CatalogItem[]>([]);
  const [profissionais, setProfissionais] = useState<CatalogItem[]>([]);
  const [sessao, setSessao] = useState<AnyRow | null>(null);
  const [movimentos, setMovimentos] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [newComandaOpen, setNewComandaOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [clienteQuery, setClienteQuery] = useState("");
  const [newComanda, setNewComanda] = useState({ clienteId: "", clienteNome: "Consumidor Final", observacoes: "" });
  const [itemForm, setItemForm] = useState({ tipo: "servico", catalogId: "", descricao: "", quantidade: 1, valor: "0", profissionalId: "", observacoes: "" });
  const [paymentForm, setPaymentForm] = useState({ forma: "pix", valor: "0", parcelas: 1, destinoExcedente: "troco", observacoes: "" });
  const [adjustForm, setAdjustForm] = useState({ desconto: "0", acrescimo: "0" });
  const [sessionForm, setSessionForm] = useState({ valor: "0", observacoes: "", tipo: "suprimento", descricao: "" });
  const [cancelReason, setCancelReason] = useState("");

  async function loadAll() {
    setLoading(true);
    setMsg("");
    try {
      const [comandasRes, agendaRes, clientesRes, servicosRes, produtosRes, profissionaisRes, sessaoRes] = await Promise.all([
        supabase
          .from("comandas")
          .select("id, numero, status, id_cliente, subtotal, desconto, acrescimo, total, observacoes, aberta_em, created_at, fechada_em, cancelada_em, clientes(nome, cashback, whatsapp)")
          .eq("id_salao", idSalao)
          .order("created_at", { ascending: false })
          .limit(160),
        supabase
          .from("agendamentos")
          .select("id, data, hora_inicio, hora_fim, status, cliente_id, profissional_id, servico_id, id_comanda, clientes(nome, cashback), profissionais(nome), servicos(nome, preco, duracao_minutos)")
          .eq("id_salao", idSalao)
          .in("status", ["confirmado", "aguardando_pagamento", "pendente"])
          .order("data")
          .order("hora_inicio")
          .limit(80),
        supabase.from("clientes").select("id, nome, whatsapp, telefone, cashback").eq("id_salao", idSalao).order("nome").limit(1000),
        supabase.from("servicos").select("id, nome, preco, duracao_minutos, ativo").eq("id_salao", idSalao).order("nome").limit(1000),
        supabase.from("produtos").select("id, nome, preco_venda, preco, valor, estoque_atual, ativo").eq("id_salao", idSalao).order("nome").limit(1000),
        supabase.from("profissionais").select("id, nome, nome_exibicao, ativo").eq("id_salao", idSalao).order("nome").limit(1000),
      supabase.from("caixa_sessoes").select("*").eq("id_salao", idSalao).eq("status", "aberto").order("aberto_em", { ascending: false }).limit(1).maybeSingle()
      ]);
      if (comandasRes.error) throw comandasRes.error;
      if (agendaRes.error) throw agendaRes.error;
      if (clientesRes.error) throw clientesRes.error;
      if (servicosRes.error) throw servicosRes.error;
      if (produtosRes.error) throw produtosRes.error;
      if (profissionaisRes.error) throw profissionaisRes.error;

      setComandas((comandasRes.data || []) as unknown as Comanda[]);
      setAgendamentos((agendaRes.data || []) as AnyRow[]);
      setClientes((clientesRes.data || []) as unknown as CatalogItem[]);
      setServicos(((servicosRes.data || []) as unknown as CatalogItem[]).filter((item) => item.ativo !== false));
      setProdutos(((produtosRes.data || []) as unknown as CatalogItem[]).filter((item) => item.ativo !== false));
      setProfissionais(((profissionaisRes.data || []) as unknown as CatalogItem[]).filter((item) => item.ativo !== false));
      setSessao((sessaoRes.data || null) as AnyRow | null);
      if (sessaoRes.data?.id) await loadMovimentos(String(sessaoRes.data.id));
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Erro ao carregar caixa.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMovimentos(idSessao: string) {
    const { data } = await supabase.from("caixa_movimentacoes").select("*").eq("id_salao", idSalao).eq("id_sessao", idSessao).order("created_at", { ascending: false }).limit(60);
    setMovimentos((data || []) as AnyRow[]);
  }

  async function loadComanda(id: string) {
    const [{ data: detalhe }, { data: items }, { data: payments }] = await Promise.all([
      supabase.from("comandas").select("id, numero, status, id_cliente, subtotal, desconto, acrescimo, total, observacoes, aberta_em, created_at, fechada_em, cancelada_em, clientes(nome, cashback, whatsapp)").eq("id", id).eq("id_salao", idSalao).maybeSingle(),
      supabase.from("comanda_itens").select("*").eq("id_salao", idSalao).eq("id_comanda", id).eq("ativo", true).order("created_at", { ascending: true }),
      supabase.from("comanda_pagamentos").select("*").eq("id_salao", idSalao).eq("id_comanda", id).order("created_at", { ascending: true })
    ]);
    if (detalhe) setSelected(detalhe as unknown as Comanda);
    setItens((items || []) as unknown as Item[]);
    setPagamentos((payments || []) as unknown as Pagamento[]);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSalao]);

  useEffect(() => {
    if (selected?.id) void loadComanda(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`sistema-caixa-${idSalao}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comandas", filter: `id_salao=eq.${idSalao}` }, () => void loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "comanda_itens", filter: `id_salao=eq.${idSalao}` }, () => selected?.id ? void loadComanda(selected.id) : void loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "comanda_pagamentos", filter: `id_salao=eq.${idSalao}` }, () => selected?.id ? void loadComanda(selected.id) : void loadAll())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSalao, selected?.id]);

  const totalItens = useMemo(() => sum(itens, "valor_total"), [itens]);
  const totalComanda = useMemo(() => Math.max(totalItens - Number(selected?.desconto || 0) + Number(selected?.acrescimo || 0), 0), [selected?.acrescimo, selected?.desconto, totalItens]);
  const totalPago = useMemo(() => pagamentos.reduce((acc, item) => acc + Math.max(Number(item.valor || 0) - Number(item.valor_troco || 0) - Number(item.valor_credito_cliente || 0), 0), 0), [pagamentos]);
  const falta = Math.max(totalComanda - totalPago, 0);
  const troco = Math.max(totalPago - totalComanda, 0);

  const visibleComandas = comandas.filter((item) => {
    const status = String(item.status || "");
    const byAba = aba === "fila"
      ? ["aberta", "aguardando_pagamento", "em_atendimento"].includes(status)
      : aba === "fechadas"
        ? status === "fechada"
        : aba === "canceladas"
          ? status === "cancelada"
          : true;
    const bySearch = `${item.numero || ""} ${displayClient(item)} ${item.status || ""}`.toLowerCase().includes(query.toLowerCase());
    return byAba && bySearch;
  });

  async function openComandaByAgenda(item: AnyRow) {
    try {
      if (item.id_comanda) {
        const comanda = comandas.find((row) => row.id === item.id_comanda);
        if (comanda) setSelected(comanda);
        else await loadComanda(String(item.id_comanda));
        setAba("fila");
        return;
      }
      const id = await createComandaFromAgendamento(item);
      await loadAll();
      await loadComanda(id);
      setAba("fila");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Erro ao abrir agendamento no caixa.");
    }
  }

  async function createComandaFromAgendamento(item: AnyRow) {
    const rpc = await supabase.rpc("fn_criar_comanda_por_agendamento", { p_id_agendamento: item.id });
    if (!rpc.error && rpc.data) return String(rpc.data);
    const numero = await nextComandaNumber(idSalao);
    const valor = Number((Array.isArray(item.servicos) ? item.servicos[0]?.preco : (item.servicos as AnyRow | null)?.preco) || 0);
    const { data, error } = await supabase.from("comandas").insert({
      id_salao: idSalao,
      numero,
      id_cliente: item.cliente_id || null,
      status: "aberta",
      subtotal: valor,
      desconto: 0,
      acrescimo: 0,
      total: valor,
      observacoes: "Criada pela agenda no caixa Vite."
    }).select("id").maybeSingle();
    if (error || !data?.id) throw error || new Error("Erro ao criar comanda.");
    await supabase.from("comanda_itens").insert({
      id_salao: idSalao,
      id_comanda: data.id,
      tipo_item: "servico",
      id_agendamento: item.id,
      id_servico: item.servico_id || null,
      id_profissional: item.profissional_id || null,
      descricao: relationName(item.servicos) || "Serviço",
      quantidade: 1,
      valor_unitario: valor,
      valor_total: valor,
      origem: "agenda",
      ativo: true
    });
    await supabase.from("agendamentos").update({ id_comanda: data.id, status: "aguardando_pagamento" }).eq("id", item.id).eq("id_salao", idSalao);
    return String(data.id);
  }

  async function createComanda() {
    const cliente = clientes.find((item) => item.id === newComanda.clienteId);
    const numero = await nextComandaNumber(idSalao);
    const { data, error } = await supabase.from("comandas").insert({
      id_salao: idSalao,
      numero,
      id_cliente: cliente?.id || null,
      status: "aberta",
      subtotal: 0,
      desconto: 0,
      acrescimo: 0,
      total: 0,
      observacoes: newComanda.observacoes || null
    }).select("*").maybeSingle();
    if (error || !data) {
      setMsg(error?.message || "Erro ao criar comanda.");
      return;
    }
    setNewComandaOpen(false);
    setSelected(data as unknown as Comanda);
    await loadAll();
  }

  function openItemModal(type = "servico", item?: Item) {
    setEditingItem(item || null);
    setItemForm({
      tipo: item?.tipo_item || type,
      catalogId: String(item?.id_servico || item?.id_produto || item?.id_item_extra || ""),
      descricao: item?.descricao || "",
      quantidade: Number(item?.quantidade || 1),
      valor: String(item?.valor_unitario || "0"),
      profissionalId: String(item?.id_profissional || ""),
      observacoes: String(item?.observacoes || "")
    });
    setItemOpen(true);
  }

  async function saveItem() {
    if (!selected) return;
    const catalog = currentCatalog().find((item) => item.id === itemForm.catalogId);
    const descricao = itemForm.descricao || catalog?.nome || "Item manual";
    const valor = Number(itemForm.valor || priceOf(catalog) || 0);
    const quantidade = Math.max(Number(itemForm.quantidade || 1), 1);
    const payload: AnyRow = {
      id_salao: idSalao,
      id_comanda: selected.id,
      tipo_item: itemForm.tipo,
      descricao,
      quantidade,
      valor_unitario: valor,
      valor_total: valor * quantidade,
      id_profissional: itemForm.profissionalId || null,
      observacoes: itemForm.observacoes || null,
      origem: "caixa_vite",
      ativo: true
    };
    if (itemForm.tipo === "servico") payload.id_servico = itemForm.catalogId || null;
    if (itemForm.tipo === "produto") payload.id_produto = itemForm.catalogId || null;
    const result = editingItem
      ? await supabase.from("comanda_itens").update(payload).eq("id", editingItem.id).eq("id_salao", idSalao)
      : await supabase.from("comanda_itens").insert(payload);
    if (result.error) {
      setMsg(result.error.message);
      return;
    }
    setItemOpen(false);
    setEditingItem(null);
    await recalcComanda(selected.id);
  }

  async function removeItem(item: Item) {
    if (!selected) return;
    const { error } = await supabase.from("comanda_itens").update({ ativo: false }).eq("id", item.id).eq("id_salao", idSalao);
    if (error) setMsg(error.message);
    await recalcComanda(selected.id);
  }

  async function recalcComanda(idComanda: string, overrides?: { desconto?: number; acrescimo?: number }) {
    const { data } = await supabase.from("comanda_itens").select("valor_total").eq("id_salao", idSalao).eq("id_comanda", idComanda).eq("ativo", true);
    const subtotal = ((data || []) as AnyRow[]).reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
    const desconto = overrides?.desconto ?? Number(selected?.desconto || 0);
    const acrescimo = overrides?.acrescimo ?? Number(selected?.acrescimo || 0);
    const total = Math.max(subtotal - desconto + acrescimo, 0);
    await supabase.from("comandas").update({ subtotal, desconto, acrescimo, total }).eq("id", idComanda).eq("id_salao", idSalao);
    await loadComanda(idComanda);
    await loadAll();
  }

  async function saveAdjust() {
    if (!selected) return;
    await recalcComanda(selected.id, { desconto: Number(adjustForm.desconto || 0), acrescimo: Number(adjustForm.acrescimo || 0) });
    setAdjustOpen(false);
  }

  async function addPayment() {
    if (!selected) return;
    const valor = Number(paymentForm.valor || 0);
    if (valor <= 0) {
      setMsg("Informe um valor válido.");
      return;
    }
    const excedente = Math.max(valor - falta, 0);
    const payload = {
      id_salao: idSalao,
      id_comanda: selected.id,
      forma_pagamento: paymentForm.forma,
      valor,
      parcelas: Number(paymentForm.parcelas || 1),
      valor_troco: excedente && paymentForm.destinoExcedente === "troco" ? excedente : 0,
      valor_credito_cliente: excedente && paymentForm.destinoExcedente === "credito_cliente" ? excedente : 0,
      destino_excedente: excedente ? paymentForm.destinoExcedente : null,
      taxa_maquininha_percentual: 0,
      taxa_maquininha_valor: 0,
      observacoes: paymentForm.observacoes || null
    };
    const { error } = await supabase.from("comanda_pagamentos").insert(payload);
    if (error) {
      setMsg(error.message);
      return;
    }
    setPaymentOpen(false);
    await loadComanda(selected.id);
  }

  async function removePayment(item: Pagamento) {
    if (!selected) return;
    const { error } = await supabase.from("comanda_pagamentos").delete().eq("id", item.id).eq("id_salao", idSalao);
    if (error) setMsg(error.message);
    await loadComanda(selected.id);
  }

  async function finalizeComanda() {
    if (!selected) return;
    if (falta > 0) {
      setMsg(`Ainda falta receber ${money(falta)}.`);
      return;
    }
    const { error } = await supabase.from("comandas").update({ status: "fechada", fechada_em: new Date().toISOString(), total: totalComanda }).eq("id", selected.id).eq("id_salao", idSalao);
    if (error) {
      setMsg(error.message);
      return;
    }
    await supabase.from("agendamentos").update({ status: "atendido" }).eq("id_comanda", selected.id).eq("id_salao", idSalao);
    if (sessao?.id) {
      await supabase.from("caixa_movimentacoes").insert({
        id_salao: idSalao,
        id_sessao: sessao.id,
        id_usuario: session.usuario.id,
        id_comanda: selected.id,
        tipo: "venda",
        forma_pagamento: pagamentos.map((item) => item.forma_pagamento).join(", "),
        valor: totalComanda,
        descricao: `Fechamento da comanda #${selected.numero}`
      });
    }
    setMsg("Comanda finalizada.");
    await loadAll();
    await loadComanda(selected.id);
  }

  async function cancelComanda() {
    if (!selected) return;
    const { error } = await supabase.from("comandas").update({ status: "cancelada", cancelada_em: new Date().toISOString(), observacoes: `${selected.observacoes || ""}\nCancelamento: ${cancelReason}`.trim() }).eq("id", selected.id).eq("id_salao", idSalao);
    if (error) setMsg(error.message);
    setCancelOpen(false);
    await loadAll();
    await loadComanda(selected.id);
  }

  async function openCashSession() {
    const { data, error } = await supabase.from("caixa_sessoes").insert({
      id_salao: idSalao,
      id_usuario_abertura: session.usuario.id,
      valor_abertura: Number(sessionForm.valor || 0),
      observacoes: sessionForm.observacoes || null,
      status: "aberto"
    }).select("*").maybeSingle();
    if (error) {
      setMsg(error.message);
      return;
    }
    setSessao(data as AnyRow);
    setSessionOpen(false);
    await loadAll();
  }

  async function closeCashSession() {
    if (!sessao?.id) return;
    const previsto = Number(sessao.valor_abertura || 0) + movimentos.reduce((acc, item) => acc + signedMovement(item), 0);
    const valorInformado = Number(sessionForm.valor || previsto);
    const { error } = await supabase.from("caixa_sessoes").update({
      id_usuario_fechamento: session.usuario.id,
      valor_fechamento_informado: valorInformado,
      status: "fechado",
      fechado_em: new Date().toISOString(),
      observacoes: sessionForm.observacoes || null
    }).eq("id", sessao.id).eq("id_salao", idSalao);
    if (error) setMsg(error.message);
    setSessao(null);
    setSessionOpen(false);
    await loadAll();
  }

  async function addMovement() {
    if (!sessao?.id) {
      setMsg("Abra o caixa antes de lançar movimentação.");
      return;
    }
    const { error } = await supabase.from("caixa_movimentacoes").insert({
      id_salao: idSalao,
      id_sessao: sessao.id,
      id_usuario: session.usuario.id,
      tipo: sessionForm.tipo,
      valor: Number(sessionForm.valor || 0),
      descricao: sessionForm.descricao || null
    });
    if (error) setMsg(error.message);
    await loadMovimentos(String(sessao.id));
    setSessionOpen(false);
  }

  function currentCatalog() {
    if (itemForm.tipo === "produto") return produtos;
    if (itemForm.tipo === "servico") return servicos;
    return [];
  }

  const clienteOptions = clienteQuery
    ? clientes.filter((item) => `${item.nome} ${item.whatsapp || ""} ${item.telefone || ""}`.toLowerCase().includes(clienteQuery.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
      <Card className="xl:min-h-[calc(100vh-7rem)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.05em]">Caixa</h2>
            <p className="text-sm font-bold text-zinc-500">Fila, agenda e comandas.</p>
          </div>
          <Button variant="secondary" className="h-10 px-3" onClick={() => void loadAll()}><RefreshCw size={15} /></Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant={aba === "fila" ? "primary" : "secondary"} onClick={() => setAba("fila")}>Fila</Button>
          <Button variant={aba === "agenda" ? "primary" : "secondary"} onClick={() => setAba("agenda")}>Agenda</Button>
          <Button variant={aba === "fechadas" ? "primary" : "secondary"} onClick={() => setAba("fechadas")}>Fechadas</Button>
          <Button variant={aba === "canceladas" ? "primary" : "secondary"} onClick={() => setAba("canceladas")}>Canceladas</Button>
        </div>
        <div className="mt-4"><SearchBox value={query} onChange={setQuery} placeholder="Buscar" /></div>
        <Button className="mt-3 w-full" onClick={() => setNewComandaOpen(true)}><Plus size={16} />Nova comanda</Button>
        <div className="mt-4 grid max-h-[calc(100vh-25rem)] gap-2 overflow-auto pr-1 thin-scrollbar">
          {loading ? <EmptyState title="Carregando" message="Atualizando caixa." /> : null}
          {aba === "agenda" ? agendamentos.map((item) => (
            <button key={String(item.id)} onClick={() => void openComandaByAgenda(item)} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{shortDate(String(item.data))} {time(String(item.hora_inicio))}</div>
              <div className="mt-1 truncate text-sm font-black">{relationName(item.clientes)}</div>
              <div className="truncate text-xs font-bold text-zinc-500">{relationName(item.servicos)} · {relationName(item.profissionais)}</div>
            </button>
          )) : visibleComandas.map((item) => (
            <button key={item.id} onClick={() => setSelected(item)} className={`rounded-2xl border p-3 text-left ${selected?.id === item.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-950"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase opacity-60">#{String(item.numero || item.id).slice(0, 6)}</div>
                  <div className="truncate text-sm font-black">{displayClient(item)}</div>
                </div>
                <StatusPill status={String(item.status || "aberta")} />
              </div>
              <div className="mt-2 text-lg font-black">{money(item.total)}</div>
            </button>
          ))}
          {!loading && aba !== "agenda" && !visibleComandas.length ? <EmptyState title="Nada encontrado" message="Nenhuma comanda nesta aba." /> : null}
        </div>
      </Card>

      <Card className="min-h-[36rem]">
        {msg ? <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{msg}</div> : null}
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Comanda #{String(selected.numero || selected.id).slice(0, 6)}</div>
                <h3 className="mt-1 text-3xl font-black tracking-[-0.06em]">{displayClient(selected)}</h3>
                <div className="mt-2"><StatusPill status={String(selected.status || "aberta")} /></div>
              </div>
              <div className="rounded-2xl bg-zinc-950 p-4 text-right text-white">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Total</div>
                <div className="text-2xl font-black">{money(totalComanda)}</div>
                <div className="text-xs font-bold text-zinc-400">Falta {money(falta)}</div>
              </div>
            </div>

            {["aberta", "aguardando_pagamento", "em_atendimento"].includes(String(selected.status)) ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Button variant="secondary" onClick={() => openItemModal("servico")}><Plus size={15} />Serviço</Button>
                <Button variant="secondary" onClick={() => openItemModal("produto")}><Plus size={15} />Produto</Button>
                <Button variant="secondary" onClick={() => { setAdjustForm({ desconto: String(selected.desconto || 0), acrescimo: String(selected.acrescimo || 0) }); setAdjustOpen(true); }}><Edit3 size={15} />Ajuste</Button>
                <Button onClick={() => { setPaymentForm((current) => ({ ...current, valor: String(falta || totalComanda) })); setPaymentOpen(true); }}><Wallet size={15} />Receber</Button>
              </div>
            ) : null}

            <section>
              <h4 className="text-lg font-black">Itens</h4>
              <div className="mt-2 grid gap-2">
                {itens.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-black">{item.descricao}</div>
                        <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{item.tipo_item} · qtd {item.quantidade}</div>
                        <div className="text-xs font-bold text-zinc-500">{money(item.valor_unitario)} unitário</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black">{money(item.valor_total)}</div>
                        {selected.status !== "fechada" && selected.status !== "cancelada" ? (
                          <div className="mt-2 flex gap-1">
                            <button className="rounded-xl bg-white p-2" onClick={() => openItemModal(item.tipo_item, item)}><Edit3 size={14} /></button>
                            <button className="rounded-xl bg-red-100 p-2 text-red-700" onClick={() => void removeItem(item)}><Trash2 size={14} /></button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {!itens.length ? <EmptyState title="Sem itens" message="Lance serviço, produto ou item manual." /> : null}
              </div>
            </section>

            <section>
              <h4 className="text-lg font-black">Pagamentos</h4>
              <div className="mt-2 grid gap-2">
                {pagamentos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                    <div>
                      <div className="text-sm font-black">{item.forma_pagamento}</div>
                      <div className="text-xs font-bold text-emerald-700">Parcelas {item.parcelas || 1}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black">{money(item.valor)}</div>
                      {selected.status !== "fechada" ? <button className="rounded-xl bg-white p-2 text-red-700" onClick={() => void removePayment(item)}><Trash2 size={14} /></button> : null}
                    </div>
                  </div>
                ))}
                {!pagamentos.length ? <EmptyState title="Sem pagamentos" message="Receba para finalizar a comanda." /> : null}
              </div>
            </section>

            <div className="grid gap-2 md:grid-cols-2">
              <Button disabled={!itens.length || falta > 0 || selected.status === "fechada" || selected.status === "cancelada"} onClick={() => void finalizeComanda()}><CheckCircle2 size={16} />Finalizar comanda</Button>
              <Button variant="danger" disabled={selected.status === "fechada" || selected.status === "cancelada"} onClick={() => setCancelOpen(true)}><Ban size={16} />Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[34rem] place-items-center text-center">
            <div>
              <Wallet className="mx-auto text-zinc-300" size={60} />
              <h3 className="mt-4 text-2xl font-black">Escolha uma comanda</h3>
              <p className="mt-1 text-sm font-bold text-zinc-500">Abra da fila ou receba direto de um agendamento.</p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">Operação</h3>
            <p className="text-sm font-bold text-zinc-500">{sessao ? "Caixa aberto" : "Caixa fechado"}</p>
          </div>
          <div className={`rounded-2xl px-3 py-2 text-xs font-black uppercase ${sessao ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{sessao ? "Aberto" : "Fechado"}</div>
        </div>
        <div className="mt-4 grid gap-2">
          <Metric label="Subtotal" value={money(totalItens)} />
          <Metric label="Desconto" value={money(selected?.desconto)} />
          <Metric label="Acréscimo" value={money(selected?.acrescimo)} />
          <Metric label="Pago" value={money(totalPago)} />
          <Metric label="Falta" value={money(falta)} />
          <Metric label="Troco" value={money(troco)} />
        </div>
        <div className="mt-4 grid gap-2">
          {!sessao ? <Button onClick={() => { setSessionForm({ ...sessionForm, valor: "0", observacoes: "" }); setSessionOpen(true); }}><Coins size={16} />Abrir caixa</Button> : (
            <>
              <Button variant="secondary" onClick={() => { setSessionForm({ ...sessionForm, valor: "0", tipo: "suprimento" }); setSessionOpen(true); }}>Lançamento</Button>
              <Button variant="secondary" onClick={() => { setSessionForm({ ...sessionForm, valor: String(Number(sessao.valor_abertura || 0) + movimentos.reduce((acc, item) => acc + signedMovement(item), 0)) }); setSessionOpen(true); }}>Fechar caixa</Button>
            </>
          )}
        </div>
        <div className="mt-4">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Movimentos</div>
          <div className="mt-2 max-h-52 overflow-auto thin-scrollbar">
            {movimentos.map((item) => <div key={String(item.id)} className="border-b border-zinc-100 py-2 text-sm"><strong>{String(item.tipo)}</strong> · {money(item.valor as number)}<div className="text-xs text-zinc-500">{String(item.descricao || "")}</div></div>)}
          </div>
        </div>
      </Card>

      <Modal title="Nova comanda" subtitle="Abra para cliente ou consumidor final." open={newComandaOpen} onClose={() => setNewComandaOpen(false)}>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-400">Cliente</span>
            {newComanda.clienteId ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"><strong>{newComanda.clienteNome}</strong><button className="ml-3 text-xs font-black text-zinc-500" onClick={() => setNewComanda({ ...newComanda, clienteId: "", clienteNome: "Consumidor Final" })}>Trocar</button></div> : (
              <>
                <Input value={clienteQuery} onChange={(event) => setClienteQuery(event.target.value)} placeholder="Digite nome ou telefone" />
                {clienteQuery ? <div className="max-h-48 overflow-auto rounded-2xl border border-zinc-200">{clienteOptions.map((item) => <button key={item.id} className="block w-full border-b border-zinc-100 px-3 py-3 text-left" onClick={() => { setNewComanda({ ...newComanda, clienteId: item.id, clienteNome: item.nome }); setClienteQuery(""); }}><strong>{item.nome}</strong><div className="text-xs text-zinc-500">{String(item.whatsapp || item.telefone || "")}</div></button>)}</div> : null}
              </>
            )}
          </div>
          <Field label="Observações"><Textarea value={newComanda.observacoes} onChange={(event) => setNewComanda({ ...newComanda, observacoes: event.target.value })} /></Field>
          <Button onClick={() => void createComanda()}>Abrir comanda</Button>
        </div>
      </Modal>

      <Modal title={editingItem ? "Editar item" : "Adicionar item"} subtitle="Serviço, produto ou lançamento manual." open={itemOpen} onClose={() => setItemOpen(false)}>
        <div className="grid gap-3">
          <Field label="Tipo"><select className="h-11 rounded-2xl border border-zinc-200 px-3 text-sm font-bold" value={itemForm.tipo} onChange={(event) => setItemForm({ ...itemForm, tipo: event.target.value, catalogId: "", descricao: "", valor: "0" })}><option value="servico">Serviço</option><option value="produto">Produto</option><option value="extra">Extra/manual</option></select></Field>
          {itemForm.tipo !== "extra" ? <CatalogPicker value={itemForm.catalogId} options={currentCatalog()} onChange={(item) => setItemForm({ ...itemForm, catalogId: item.id, descricao: item.nome, valor: String(priceOf(item)) })} /> : null}
          <Field label="Descrição"><Input value={itemForm.descricao} onChange={(event) => setItemForm({ ...itemForm, descricao: event.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade"><Input type="number" min={1} value={itemForm.quantidade} onChange={(event) => setItemForm({ ...itemForm, quantidade: Number(event.target.value) })} /></Field>
            <Field label="Valor unitário"><Input inputMode="decimal" value={itemForm.valor} onChange={(event) => setItemForm({ ...itemForm, valor: event.target.value })} /></Field>
          </div>
          <CatalogPicker label="Profissional" value={itemForm.profissionalId} options={profissionais} onChange={(item) => setItemForm({ ...itemForm, profissionalId: item.id })} optional />
          <Field label="Observações"><Textarea value={itemForm.observacoes} onChange={(event) => setItemForm({ ...itemForm, observacoes: event.target.value })} /></Field>
          <Button onClick={() => void saveItem()}>Salvar item</Button>
        </div>
      </Modal>

      <Modal title="Receber pagamento" subtitle="Lance pagamento, troco ou crédito da cliente." open={paymentOpen} onClose={() => setPaymentOpen(false)}>
        <div className="grid gap-3">
          <Field label="Forma"><select className="h-11 rounded-2xl border border-zinc-200 px-3 text-sm font-bold" value={paymentForm.forma} onChange={(event) => setPaymentForm({ ...paymentForm, forma: event.target.value })}>{formasPagamento.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor"><Input inputMode="decimal" value={paymentForm.valor} onChange={(event) => setPaymentForm({ ...paymentForm, valor: event.target.value })} /></Field>
            <Field label="Parcelas"><Input type="number" min={1} value={paymentForm.parcelas} onChange={(event) => setPaymentForm({ ...paymentForm, parcelas: Number(event.target.value) })} /></Field>
          </div>
          {Number(paymentForm.valor || 0) > falta ? <Field label="Excedente"><select className="h-11 rounded-2xl border border-zinc-200 px-3 text-sm font-bold" value={paymentForm.destinoExcedente} onChange={(event) => setPaymentForm({ ...paymentForm, destinoExcedente: event.target.value })}><option value="troco">Troco</option><option value="credito_cliente">Crédito da cliente</option></select></Field> : null}
          <Field label="Observações"><Textarea value={paymentForm.observacoes} onChange={(event) => setPaymentForm({ ...paymentForm, observacoes: event.target.value })} /></Field>
          <Button onClick={() => void addPayment()}>Adicionar pagamento</Button>
        </div>
      </Modal>

      <Modal title="Acréscimo / desconto" open={adjustOpen} onClose={() => setAdjustOpen(false)}>
        <div className="grid gap-3">
          <Field label="Desconto"><Input inputMode="decimal" value={adjustForm.desconto} onChange={(event) => setAdjustForm({ ...adjustForm, desconto: event.target.value })} /></Field>
          <Field label="Acréscimo"><Input inputMode="decimal" value={adjustForm.acrescimo} onChange={(event) => setAdjustForm({ ...adjustForm, acrescimo: event.target.value })} /></Field>
          <Button onClick={() => void saveAdjust()}>Salvar ajuste</Button>
        </div>
      </Modal>

      <Modal title={sessao ? "Operação do caixa" : "Abrir caixa"} open={sessionOpen} onClose={() => setSessionOpen(false)}>
        <div className="grid gap-3">
          {sessao ? <Field label="Tipo"><select className="h-11 rounded-2xl border border-zinc-200 px-3 text-sm font-bold" value={sessionForm.tipo} onChange={(event) => setSessionForm({ ...sessionForm, tipo: event.target.value })}><option value="suprimento">Suprimento</option><option value="sangria">Sangria</option><option value="ajuste">Ajuste</option><option value="vale_profissional">Vale profissional</option></select></Field> : null}
          <Field label="Valor"><Input inputMode="decimal" value={sessionForm.valor} onChange={(event) => setSessionForm({ ...sessionForm, valor: event.target.value })} /></Field>
          <Field label="Descrição / observação"><Textarea value={sessionForm.descricao || sessionForm.observacoes} onChange={(event) => setSessionForm({ ...sessionForm, descricao: event.target.value, observacoes: event.target.value })} /></Field>
          {!sessao ? <Button onClick={() => void openCashSession()}>Abrir caixa</Button> : <><Button variant="secondary" onClick={() => void addMovement()}>Lançar movimento</Button><Button onClick={() => void closeCashSession()}>Fechar caixa</Button></>}
        </div>
      </Modal>

      <Modal title="Cancelar comanda" subtitle="Informe o motivo do cancelamento." open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <div className="grid gap-3">
          <Field label="Motivo"><Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></Field>
          <Button variant="danger" onClick={() => void cancelComanda()}>Cancelar comanda</Button>
        </div>
      </Modal>
    </div>
  );
}

function CatalogPicker({ value, options, onChange, label = "Buscar item", optional }: { value: string; options: CatalogItem[]; onChange: (item: CatalogItem) => void; label?: string; optional?: boolean }) {
  const [query, setQuery] = useState("");
  const selected = options.find((item) => item.id === value);
  const filtered = query ? options.filter((item) => item.nome.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [];
  return (
    <div className="grid gap-2">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      {selected ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"><strong>{selected.nome}</strong><span className="ml-2 text-xs font-bold text-zinc-500">{money(priceOf(selected))}</span><button className="ml-3 text-xs font-black text-zinc-500" onClick={() => onChange({ id: "", nome: "" })}>Trocar</button></div> : (
        <>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={17} /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={optional ? "Opcional: digite para buscar" : "Digite para buscar"} /></div>
          {query ? <div className="max-h-48 overflow-auto rounded-2xl border border-zinc-200 thin-scrollbar">{filtered.map((item) => <button key={item.id} className="block w-full border-b border-zinc-100 px-3 py-3 text-left" onClick={() => { onChange(item); setQuery(""); }}><strong>{item.nome}</strong><div className="text-xs text-zinc-500">{money(priceOf(item))} {item.duracao_minutos ? `· ${duration(item.duracao_minutos)}` : ""}</div></button>)}{!filtered.length ? <div className="px-3 py-4 text-center text-sm font-bold text-zinc-500">Nada encontrado.</div> : null}</div> : null}
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-zinc-50 p-3"><div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{label}</div><div className="text-base font-black text-zinc-950">{value}</div></div>;
}

async function nextComandaNumber(idSalao: string) {
  const { data } = await supabase.from("comandas").select("numero").eq("id_salao", idSalao).order("numero", { ascending: false }).limit(1);
  return Number((data?.[0] as AnyRow | undefined)?.numero || 0) + 1;
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return String((value[0] as AnyRow | undefined)?.nome || "");
  return String((value as AnyRow | null)?.nome || "");
}

function displayClient(item: Comanda) {
  return String(relationName(item.clientes) || "Consumidor Final");
}

function priceOf(item?: CatalogItem | null) {
  return Number(item?.preco_venda ?? item?.preco ?? item?.valor ?? 0);
}

function sum(rows: AnyRow[], key: string) {
  return rows.reduce((acc, item) => acc + Number(item[key] || 0), 0);
}

function signedMovement(item: AnyRow) {
  const tipo = String(item.tipo || "");
  const valor = Number(item.valor || 0);
  return ["sangria", "vale_profissional"].includes(tipo) ? -valor : valor;
}
