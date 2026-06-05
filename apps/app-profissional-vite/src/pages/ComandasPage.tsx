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

type Actions = {
  abrirComanda: (clienteId: string | null, clienteNome: string) => Promise<void>;
  adicionarItemComanda: (comandaId: string, item: { servico_id?: string | null; nome: string; quantidade: number; valor_unitario: number; tipo?: "servico" | "produto" }) => Promise<void>;
  fecharComanda: (id: string) => Promise<void>;
};

export function ComandasPage({ clientes, servicos, comandas, itens, actions }: { clientes: Cliente[]; servicos: Servico[]; comandas: Comanda[]; itens: ItemComanda[]; actions: Actions }) {
  const [clienteId, setClienteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const abertas = comandas.filter((item) => item.status === "aberta");
  const totalAberto = abertas.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const selected = selectedId ? comandas.find((item) => item.id === selectedId) || null : null;
  const filtered = comandas.filter((item) => `${item.cliente_nome} ${item.numero || ""} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const clienteOptions = clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome, description: cliente.telefone || cliente.whatsapp || "Sem telefone" }));

  async function abrir(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const cliente = clientes.find((item) => item.id === clienteId);
      await actions.abrirComanda(cliente?.id ?? null, cliente?.nome ?? "Consumidor Final");
      setClienteId("");
      setPage(1);
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
              Controle rapido
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
          <Button className="h-11 px-4" onClick={() => setNewOpen(true)}>Abrir</Button>
        </div>
      </Card>

      <Modal title="Nova comanda" subtitle="Digite para procurar o cliente ou abra como consumidor final." open={newOpen} onClose={() => setNewOpen(false)}>
        <form onSubmit={abrir} className="grid gap-3">
          <SearchPicker hideInputWhenSelected label="Cliente" placeholder="Digite nome ou telefone" options={clienteOptions} value={clienteId} onChange={setClienteId} emptyText="Cliente nao encontrado." />
          <ModalActionBar>
            <Button loading={loading} onClick={() => setNewOpen(false)}>Abrir atendimento</Button>
            <Button loading={loading} type="button" variant="secondary" onClick={async () => {
              setLoading(true);
              try {
                await actions.abrirComanda(null, "Consumidor Final");
                setClienteId("");
                setNewOpen(false);
              } finally {
                setLoading(false);
              }
            }}>Consumidor final</Button>
          </ModalActionBar>
        </form>
      </Modal>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Lista de comandas</h2>
            <p className="text-sm font-bold text-zinc-500">Toque para adicionar itens, revisar ou fechar.</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{filtered.length}</span>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <Input className="pl-11" placeholder="Buscar comanda" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </div>

        <div className="mt-4 space-y-2.5">
          {pageItems.length ? pageItems.map((comanda) => (
            <button key={comanda.id} onClick={() => setSelectedId(comanda.id)} className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left active:scale-[0.99]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Comanda #{comanda.numero || comanda.id.slice(0, 4)}</div>
                  <div className="mt-1 truncate text-base font-black text-zinc-950">{comanda.cliente_nome}</div>
                </div>
                <StatusPill status={comanda.status} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-lg font-black tracking-[-0.04em] text-zinc-950">{money(comanda.total)}</span>
                <span className="text-xs font-bold text-zinc-500">{comanda.fechada_em ? "Fechada" : "Em atendimento"}</span>
              </div>
            </button>
          )) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">Nenhuma comanda encontrada.</div>
          )}
        </div>

        {filtered.length > PAGE_SIZE ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
            <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Proxima</Button>
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
  const [valor, setValor] = useState("0");
  const [serviceOpen, setServiceOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const total = useMemo(() => itens.reduce((acc, item) => acc + Number(item.total || 0), 0), [itens]);
  const aberta = comanda.status === "aberta";
  const servicoOptions = servicos.map((servico) => ({ value: servico.id, label: servico.nome, description: `${servico.duracao_minutos || 0} min`, meta: money(servico.preco) }));

  async function addServico() {
    const servico = servicos.find((item) => item.id === servicoId);
    if (!servico) return;
    setBusy(true);
    try {
      await actions.adicionarItemComanda(comanda.id, { servico_id: servico.id, nome: servico.nome, quantidade, valor_unitario: servico.preco, tipo: "servico" });
      setServicoId("");
      setQuantidade(1);
    } finally {
      setBusy(false);
    }
  }

  async function addProduto() {
    if (!produto.trim()) return;
    setBusy(true);
    try {
      await actions.adicionarItemComanda(comanda.id, { nome: produto, quantidade: 1, valor_unitario: Number(valor), tipo: "produto" });
      setProduto("");
      setValor("0");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <button className="inline-flex items-center gap-2 text-sm font-black text-zinc-700" onClick={onBack}>
        <ArrowLeft size={18} />
        Voltar para comandas
      </button>

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
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{item.tipo} - Qtd. {item.quantidade}</div>
                  <div className="mt-1 text-sm font-bold text-zinc-500">Unitario: {money(item.valor_unitario)}</div>
                </div>
                <div className="text-right text-sm font-black text-zinc-950">{money(item.total)}</div>
              </div>
            </div>
          )) : <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">Nenhum item lancado.</div>}
        </div>
      </Card>

      {aberta ? (
        <>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <WalletCards size={19} />
                  <h2 className="text-xl font-black tracking-[-0.04em]">Operacao</h2>
                </div>
                <p className="mt-1 text-sm font-bold text-zinc-500">Lance servicos e produtos sem baguncar a tela.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setServiceOpen(true)}>Adicionar servico</Button>
              <Button variant="secondary" onClick={() => setProductOpen(true)}>Produto extra</Button>
            </div>
          </Card>

          <Modal title="Adicionar servico" subtitle="Digite para buscar o servico executado." open={serviceOpen} onClose={() => setServiceOpen(false)}>
            <div className="grid gap-3">
              <SearchPicker hideInputWhenSelected label="Servico" placeholder="Digite o servico" options={servicoOptions} value={servicoId} onChange={setServicoId} />
              <Field label="Quantidade"><Input type="number" min={1} step={1} value={quantidade} onChange={(event) => setQuantidade(Number(event.target.value))} /></Field>
              <ModalActionBar>
                <Button loading={busy} onClick={async () => { await addServico(); setServiceOpen(false); }}>Adicionar servico</Button>
              </ModalActionBar>
            </div>
          </Modal>

          <Modal title="Produto extra" subtitle="Lance adicionais usados no atendimento." open={productOpen} onClose={() => setProductOpen(false)}>
            <div className="grid gap-3">
              <Field label="Produto"><Input placeholder="Produto" value={produto} onChange={(event) => setProduto(event.target.value)} /></Field>
              <Field label="Valor"><Input inputMode="decimal" value={valor} onChange={(event) => setValor(event.target.value)} /></Field>
              <ModalActionBar>
                <Button loading={busy} onClick={async () => { await addProduto(); setProductOpen(false); }}>Adicionar produto</Button>
              </ModalActionBar>
            </div>
          </Modal>

          <Button className="w-full" disabled={!itens.length} onClick={() => actions.fecharComanda(comanda.id)}>Enviar para o caixa</Button>
        </>
      ) : (
        <Card className="border-amber-200 bg-amber-50 text-amber-800">
          <div className="text-sm font-bold">Esta comanda ja foi enviada/fechada e nao aceita novos itens.</div>
        </Card>
      )}
    </div>
  );
}

function StatusPill({ status, dark = false }: { status: string; dark?: boolean }) {
  const label = status === "aberta" ? "Aberta" : status === "fechada" ? "Fechada" : status === "aguardando_pagamento" ? "Aguardando" : status;
  const color = status === "aberta" ? "bg-blue-100 text-blue-800" : status === "fechada" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";
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

