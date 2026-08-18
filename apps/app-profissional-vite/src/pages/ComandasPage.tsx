import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, PlusCircle, Receipt, Search, WalletCards } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input } from "../components/ui/Input";
import { Modal, ModalActionBar } from "../components/ui/Modal";
import { SearchPicker } from "../components/ui/SearchPicker";
import { money } from "../lib/date";
import type { Cliente, Comanda, ItemComanda, Servico } from "../types/database";

const PAGE_SIZE = 8;

const STATUS_LABELS: Record<string, string> = {
  aberta: "Aberta",
  fechada: "Fechada",
  aguardando_pagamento: "Aguardando pagamento",
  paga: "Paga",
  cancelada: "Cancelada",
};

function statusLabel(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  return STATUS_LABELS[normalized] || (normalized ? normalized.replace(/_/g, " ") : "Não informado");
}

function sanitizeMoneyInput(value: string) {
  const cleaned = String(value || "").replace(/[^\d,]/g, "");
  const parts = cleaned.split(",");
  const integerPart = parts[0] || "";
  const decimalPart = parts.slice(1).join("").slice(0, 2);
  return parts.length > 1 ? `${integerPart},${decimalPart}` : integerPart;
}

function parseMoneyInput(value: string) {
  const normalized = String(value || "").trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatMoneyInput(value: string) {
  const parsed = parseMoneyInput(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Actions = {
  abrirComanda: (clienteId: string | null, clienteNome: string) => Promise<void>;
  adicionarItemComanda: (comandaId: string, item: { servico_id?: string | null; nome: string; quantidade: number; valor_unitario: number; tipo?: "servico" | "produto" }) => Promise<void>;
  fecharComanda: (id: string) => Promise<void>;
};

export function ComandasPage({ clientes, servicos, comandas, itens, actions }: { clientes: Cliente[]; servicos: Servico[]; comandas: Comanda[]; itens: ItemComanda[]; actions: Actions }) {
  const [clienteId, setClienteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const abertas = comandas.filter((item) => item.status === "aberta");
  const totalAberto = abertas.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const selected = selectedId ? comandas.find((item) => item.id === selectedId) || null : null;
  const filtered = comandas.filter((item) => `${item.cliente_nome} ${item.numero || ""} ${statusLabel(item.status)}`.toLowerCase().includes(query.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const clienteOptions = clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome, description: cliente.telefone || cliente.whatsapp || "Sem telefone" }));

  async function abrir(event: FormEvent) {
    event.preventDefault();
    if (loading || !clienteId) return;
    const cliente = clientes.find((item) => item.id === clienteId);
    if (!cliente) {
      setError("Selecione uma cliente válida.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await actions.abrirComanda(cliente.id, cliente.nome);
      setClienteId("");
      setPage(1);
      setNewOpen(false);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Não foi possível abrir a comanda.");
    } finally {
      setLoading(false);
    }
  }

  async function abrirConsumidorFinal() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await actions.abrirComanda(null, "Consumidor Final");
      setClienteId("");
      setNewOpen(false);
      setPage(1);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Não foi possível abrir a comanda.");
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return <ComandaDetail comanda={selected} servicos={servicos} itens={itens.filter((item) => item.comanda_id === selected.id)} actions={actions} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
              <Receipt size={14} />
              Controle rápido
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.06em]">{abertas.length} abertas</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">Entre direto na comanda certa sem poluir a tela principal.</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-right">
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">Total aberto</div>
            <div className="mt-1 text-lg font-black">{money(totalAberto)}</div>
          </div>
        </div>
      </section>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <PlusCircle size={20} />
              <h2 className="text-xl font-black tracking-[-0.04em]">Nova comanda</h2>
            </div>
            <p className="mt-1 text-sm font-bold text-zinc-500">Abra uma comanda avulsa para atendimento sem agendamento.</p>
          </div>
          <Button type="button" className="h-11 px-4" onClick={() => { setError(""); setNewOpen(true); }}>Abrir</Button>
        </div>
      </Card>

      <Modal title="Nova comanda" subtitle="Procure a cliente ou abra como consumidor final." open={newOpen} onClose={() => { if (!loading) setNewOpen(false); }}>
        <form onSubmit={abrir} className="grid gap-3">
          <SearchPicker hideInputWhenSelected label="Cliente" placeholder="Digite nome ou telefone" options={clienteOptions} value={clienteId} onChange={(value) => { setClienteId(value); setError(""); }} emptyText="Cliente não encontrado." />
          {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div> : null}
          <ModalActionBar>
            <Button type="submit" loading={loading} disabled={!clienteId}>Abrir atendimento</Button>
            <Button type="button" loading={loading} variant="secondary" onClick={() => void abrirConsumidorFinal()}>Consumidor final</Button>
          </ModalActionBar>
        </form>
      </Modal>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Lista de comandas</h2>
            <p className="text-sm font-bold text-zinc-500">Toque para adicionar itens, revisar ou enviar ao caixa.</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{filtered.length}</span>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <Input className="pl-11" placeholder="Buscar comanda" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </div>

        <div className="mt-4 space-y-2.5">
          {pageItems.length ? pageItems.map((comanda) => (
            <button type="button" key={comanda.id} onClick={() => setSelectedId(comanda.id)} className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left active:scale-[0.99]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Comanda #{comanda.numero || comanda.id.slice(0, 4)}</div>
                  <div className="mt-1 truncate text-base font-black text-zinc-950">{comanda.cliente_nome}</div>
                </div>
                <StatusPill status={comanda.status} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-lg font-black tracking-[-0.04em] text-zinc-950">{money(comanda.total)}</span>
                <span className="text-xs font-bold text-zinc-500">{statusLabel(comanda.status)}</span>
              </div>
            </button>
          )) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">Nenhuma comanda encontrada.</div>
          )}
        </div>

        {filtered.length > PAGE_SIZE ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
            <Button type="button" variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Próxima</Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function ComandaDetail({ comanda, servicos, itens, actions, onBack }: { comanda: Comanda; servicos: Servico[]; itens: ItemComanda[]; actions: Actions; onBack: () => void }) {
  const [servicoId, setServicoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [produto, setProduto] = useState("");
  const [valor, setValor] = useState("0,00");
  const [serviceOpen, setServiceOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [busy, setBusy] = useState<"servico" | "produto" | "fechar" | null>(null);
  const [error, setError] = useState("");
  const total = useMemo(() => itens.reduce((acc, item) => acc + Number(item.total || 0), 0), [itens]);
  const aberta = comanda.status === "aberta";
  const servicoOptions = servicos.map((servico) => ({ value: servico.id, label: servico.nome, description: `${servico.duracao_minutos || 0} min`, meta: money(servico.preco) }));

  async function addServico() {
    const servico = servicos.find((item) => item.id === servicoId);
    if (!servico) {
      setError("Selecione um serviço.");
      return;
    }
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      setError("Informe uma quantidade válida.");
      return;
    }

    setBusy("servico");
    setError("");
    try {
      await actions.adicionarItemComanda(comanda.id, { servico_id: servico.id, nome: servico.nome, quantidade, valor_unitario: Number(servico.preco), tipo: "servico" });
      setServicoId("");
      setQuantidade(1);
      setServiceOpen(false);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Não foi possível adicionar o serviço.");
    } finally {
      setBusy(null);
    }
  }

  async function addProduto() {
    const valorNumerico = parseMoneyInput(valor);
    if (!produto.trim()) {
      setError("Informe o nome do produto.");
      return;
    }
    if (!Number.isFinite(valorNumerico) || valorNumerico < 0) {
      setError("Informe um valor válido para o produto.");
      return;
    }

    setBusy("produto");
    setError("");
    try {
      await actions.adicionarItemComanda(comanda.id, { nome: produto.trim(), quantidade: 1, valor_unitario: valorNumerico, tipo: "produto" });
      setProduto("");
      setValor("0,00");
      setProductOpen(false);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Não foi possível adicionar o produto.");
    } finally {
      setBusy(null);
    }
  }

  async function fechar() {
    if (busy || !itens.length) return;
    setBusy("fechar");
    setError("");
    try {
      await actions.fecharComanda(comanda.id);
      setFinishOpen(false);
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "Não foi possível enviar a comanda para o caixa.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <button type="button" className="inline-flex items-center gap-2 text-sm font-black text-zinc-700" onClick={onBack} disabled={Boolean(busy)}>
        <ArrowLeft size={18} />
        Voltar para comandas
      </button>

      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

      <section className="rounded-[1.5rem] bg-zinc-950 p-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Cliente</div>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">{comanda.cliente_nome}</h2>
          </div>
          <StatusPill status={comanda.status} dark />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Subtotal" value={money(Number(comanda.subtotal ?? total))} />
          <Metric label="Desconto" value={money(Number(comanda.desconto ?? 0))} />
          <Metric label="Total" value={money(total || comanda.total)} />
        </div>
      </section>

      <Card>
        <h2 className="text-xl font-black tracking-[-0.04em]">Itens da comanda</h2>
        <div className="mt-4 space-y-2.5">
          {itens.length ? itens.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-black text-zinc-950">{item.nome}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{item.tipo === "servico" ? "Serviço" : "Produto"} - Qtd. {item.quantidade}</div>
                  <div className="mt-1 text-sm font-bold text-zinc-500">Unitário: {money(item.valor_unitario)}</div>
                </div>
                <div className="text-right text-sm font-black text-zinc-950">{money(item.total)}</div>
              </div>
            </div>
          )) : <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">Nenhum item lançado.</div>}
        </div>
      </Card>

      {aberta ? (
        <>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <WalletCards size={19} />
                  <h2 className="text-xl font-black tracking-[-0.04em]">Operação</h2>
                </div>
                <p className="mt-1 text-sm font-bold text-zinc-500">Lance serviços e produtos usados no atendimento.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => { setError(""); setServiceOpen(true); }}>Adicionar serviço</Button>
              <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => { setError(""); setProductOpen(true); }}>Produto extra</Button>
            </div>
          </Card>

          <Modal title="Adicionar serviço" subtitle="Busque o serviço executado e confirme a quantidade." open={serviceOpen} onClose={() => { if (!busy) setServiceOpen(false); }}>
            <div className="grid gap-3">
              <SearchPicker hideInputWhenSelected label="Serviço" placeholder="Digite o serviço" options={servicoOptions} value={servicoId} onChange={(value) => { setServicoId(value); setError(""); }} />
              <Field label="Quantidade"><Input type="number" min={1} step={1} value={quantidade} onChange={(event) => setQuantidade(Number(event.target.value))} /></Field>
              {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div> : null}
              <ModalActionBar>
                <Button type="button" loading={busy === "servico"} disabled={Boolean(busy) && busy !== "servico"} onClick={() => void addServico()}>Adicionar serviço</Button>
              </ModalActionBar>
            </div>
          </Modal>

          <Modal title="Produto extra" subtitle="Lance um produto adicional usado no atendimento." open={productOpen} onClose={() => { if (!busy) setProductOpen(false); }}>
            <div className="grid gap-3">
              <Field label="Produto"><Input placeholder="Nome do produto" value={produto} onChange={(event) => { setProduto(event.target.value); setError(""); }} /></Field>
              <Field label="Valor"><Input inputMode="decimal" value={valor} onChange={(event) => setValor(sanitizeMoneyInput(event.target.value))} onBlur={() => setValor(formatMoneyInput(valor))} placeholder="0,00" /></Field>
              {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div> : null}
              <ModalActionBar>
                <Button type="button" loading={busy === "produto"} disabled={Boolean(busy) && busy !== "produto"} onClick={() => void addProduto()}>Adicionar produto</Button>
              </ModalActionBar>
            </div>
          </Modal>

          <Button type="button" className="w-full" disabled={!itens.length || Boolean(busy)} onClick={() => { setError(""); setFinishOpen(true); }}>Enviar para o caixa</Button>

          <Modal title="Enviar comanda para o caixa" subtitle="Confira antes de concluir o atendimento." open={finishOpen} onClose={() => { if (!busy) setFinishOpen(false); }}>
            <p className="text-sm font-semibold leading-6 text-zinc-600">
              A comanda de <strong>{comanda.cliente_nome}</strong> será enviada ao caixa com total de <strong>{money(total || comanda.total)}</strong>.
            </p>
            {error ? <div role="alert" className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div> : null}
            <ModalActionBar>
              <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => setFinishOpen(false)}>Voltar</Button>
              <Button type="button" loading={busy === "fechar"} onClick={() => void fechar()}>Confirmar envio</Button>
            </ModalActionBar>
          </Modal>
        </>
      ) : (
        <Card className="border-amber-200 bg-amber-50 text-amber-800">
          <div className="text-sm font-bold">Esta comanda já foi enviada ou fechada e não aceita novos itens.</div>
        </Card>
      )}
    </div>
  );
}

function StatusPill({ status, dark = false }: { status: string; dark?: boolean }) {
  const label = statusLabel(status);
  const color = status === "aberta" ? "bg-blue-100 text-blue-800" : status === "fechada" || status === "paga" ? "bg-emerald-100 text-emerald-800" : status === "cancelada" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800";
  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${dark ? "bg-white/10 text-white" : color}`}>{label}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}
