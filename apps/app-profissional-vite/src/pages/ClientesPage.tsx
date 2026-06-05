import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, CalendarPlus2, Edit3, Phone, Plus, Receipt, Search } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input, Textarea } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { money } from "../lib/date";
import type { Agendamento, Cliente, Comanda } from "../types/database";

type Payload = Pick<Cliente, "nome" | "telefone" | "observacoes">;
const PAGE_SIZE = 10;

export function ClientesPage({
  clientes,
  agendamentos,
  comandas,
  onSave,
  onEdit
}: {
  clientes: Cliente[];
  agendamentos: Agendamento[];
  comandas: Comanda[];
  onSave: (payload: Payload) => Promise<void>;
  onEdit?: (id: string, payload: Payload) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = clientes.filter((cliente) => `${cliente.nome} ${cliente.telefone || ""} ${cliente.whatsapp || ""}`.toLowerCase().includes(query.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (selected) {
    return (
      <ClienteDetail
        cliente={selected}
        agendamentos={agendamentos.filter((item) => item.cliente_id === selected.id).sort((a, b) => `${b.data} ${b.hora_inicio}`.localeCompare(`${a.data} ${a.hora_inicio}`))}
        comandas={comandas.filter((item) => item.cliente_id === selected.id)}
        onBack={() => setSelected(null)}
        onEdit={() => setEditing(selected)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setCreating(true)}>
        <Plus size={18} />
        Novo cliente
      </Button>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Clientes</h2>
            <p className="text-sm font-bold text-zinc-500">Toque para ver historico e observacoes.</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{filtered.length}</span>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <Input className="pl-11" placeholder="Buscar cliente" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </div>
      </Card>

      <div className="space-y-3">
        {pageItems.map((cliente) => {
          const historico = agendamentos.filter((item) => item.cliente_id === cliente.id);
          return (
            <Card key={cliente.id}>
              <button className="block w-full text-left" onClick={() => setSelected(cliente)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black tracking-[-0.03em]">{cliente.nome}</h3>
                    <p className="text-sm font-bold text-zinc-500">{cliente.telefone || cliente.whatsapp || "Sem telefone"}</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{historico.length} ag.</span>
                </div>
                {historico.length ? <p className="mt-3 text-sm font-semibold text-zinc-500">Ultimo horario: {historico[0]?.data} as {historico[0]?.hora_inicio.slice(0, 5)}</p> : null}
              </button>
              <Button className="mt-3 h-9 px-3" variant="secondary" onClick={() => setEditing(cliente)}>
                <Edit3 size={15} />
                Editar cliente
              </Button>
            </Card>
          );
        })}
      </div>

      {filtered.length > PAGE_SIZE ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
          <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Proxima</Button>
        </div>
      ) : null}

      <Modal title="Novo cliente" open={creating} onClose={() => setCreating(false)}>
        <ClienteForm onSubmit={async (payload) => { await onSave(payload); setCreating(false); }} />
      </Modal>

      <Modal title="Editar cliente" open={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing ? (
          <ClienteForm
            initial={editing}
            onSubmit={async (payload) => {
              await onEdit?.(editing.id, payload);
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function ClienteDetail({ cliente, agendamentos, comandas, onBack, onEdit }: { cliente: Cliente; agendamentos: Agendamento[]; comandas: Comanda[]; onBack: () => void; onEdit: () => void }) {
  const creditoGerado = Number(cliente.credito_total || 0);
  const totalFechado = comandas.filter((item) => item.status === "fechada").reduce((acc, item) => acc + Number(item.total || 0), 0);

  return (
    <div className="space-y-4 pb-6">
      <button className="inline-flex items-center gap-2 text-sm font-black text-zinc-700" onClick={onBack}>
        <ArrowLeft size={18} />
        Voltar para clientes
      </button>

      <section className="rounded-[1.5rem] bg-zinc-950 p-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
              <Phone size={14} />
              Cadastro
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em]">{cliente.nome}</h2>
            <p className="mt-2 text-sm font-semibold text-zinc-300">{cliente.telefone || cliente.whatsapp || "Sem telefone"}</p>
          </div>
          <Button variant="secondary" className="h-10 px-3" onClick={onEdit}>
            <Edit3 size={15} />
            Editar
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <Receipt className="text-emerald-600" size={20} />
          <div className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Credito gerado</div>
          <div className="mt-1 text-xl font-black">{money(creditoGerado)}</div>
        </Card>
        <Card>
          <CalendarPlus2 className="text-blue-600" size={20} />
          <div className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Total atendido</div>
          <div className="mt-1 text-xl font-black">{money(totalFechado)}</div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-black tracking-[-0.04em]">Informacoes</h2>
        <div className="mt-3 grid gap-2 text-sm font-bold text-zinc-600">
          <div>Email: {cliente.email || "Sem email"}</div>
          <div>WhatsApp: {cliente.whatsapp || cliente.telefone || "Sem WhatsApp"}</div>
          <div>Status: {cliente.status || "Ativo"}</div>
        </div>
        {cliente.observacoes ? <p className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm font-semibold leading-6 text-zinc-600">{cliente.observacoes}</p> : null}
      </Card>

      <Card>
        <h2 className="text-xl font-black tracking-[-0.04em]">Historico de atendimentos</h2>
        <div className="mt-4 space-y-3">
          {agendamentos.length ? agendamentos.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-black text-zinc-950">{item.data} as {item.hora_inicio.slice(0, 5)}</div>
                  <div className="mt-1 text-sm font-bold text-zinc-600">{item.servicos?.nome || "Servico"}</div>
                  <div className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{item.status}</div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-600">{item.profissional_nome || "Profissional"}</span>
              </div>
              <div className="mt-3 rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-zinc-600">
                Observacao do atendimento: {item.observacoes || "Sem observacao registrada."}
              </div>
            </div>
          )) : <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">Sem historico ainda.</div>}
        </div>
      </Card>
    </div>
  );
}

function ClienteForm({ initial, onSubmit }: { initial?: Cliente; onSubmit: (payload: Payload) => Promise<void> }) {
  const [nome, setNome] = useState(initial?.nome || "");
  const [telefone, setTelefone] = useState(initial?.telefone || "");
  const [observacoes, setObservacoes] = useState(initial?.observacoes || "");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onSubmit({ nome, telefone, observacoes });
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Nome"><Input required value={nome} onChange={(event) => setNome(event.target.value)} /></Field>
      <Field label="Telefone"><Input inputMode="tel" value={telefone} onChange={(event) => setTelefone(event.target.value)} /></Field>
      <Field label="Observacoes"><Textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} /></Field>
      <Button loading={loading}>Salvar cliente</Button>
    </form>
  );
}
