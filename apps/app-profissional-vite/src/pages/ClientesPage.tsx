import { FormEvent, useState } from "react";
import { ArrowLeft, CalendarPlus2, Edit3, Phone, Plus, Receipt, Search } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input, Textarea } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { money } from "../lib/date";
import type { Agendamento, Cliente, Comanda } from "../types/database";

type Payload = Pick<Cliente, "nome" | "telefone" | "observacoes">;
const PAGE_SIZE = 10;

function whatsappDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatWhatsApp(value?: string | null) {
  const digits = whatsappDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${ddd}) ${number}`;
  if (number.length <= 8) return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
  return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5, 9)}`;
}

function clienteWhatsApp(cliente: Cliente) {
  return cliente.whatsapp || cliente.telefone || "";
}

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

  const normalizedQuery = query.trim().toLowerCase();
  const queryDigits = whatsappDigits(query);
  const filtered = clientes.filter((cliente) => {
    const whatsapp = clienteWhatsApp(cliente);
    return (
      cliente.nome.toLowerCase().includes(normalizedQuery) ||
      (!!queryDigits && whatsappDigits(whatsapp).includes(queryDigits))
    );
  });
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
    <div className="space-y-5 pb-6">
      <Button
        className="h-14 w-full rounded-[1.35rem] text-[15px] shadow-[0_14px_30px_rgba(9,9,11,0.16)] active:scale-[0.99]"
        onClick={() => setCreating(true)}
      >
        <Plus size={19} />
        Novo cliente
      </Button>

      <Card className="rounded-[1.6rem] !p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">Sua base de clientes</div>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950">Clientes</h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-zinc-500">Encontre rapidamente e consulte o histórico de cada cliente.</p>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-950 px-3.5 py-1.5 text-xs font-black text-white shadow-sm">{filtered.length}</span>
        </div>
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={19} />
          <Input
            className="h-12 rounded-[1.15rem] border-zinc-200 bg-zinc-50 pl-11 shadow-inner shadow-zinc-100/60 focus:bg-white"
            placeholder="Buscar por nome ou WhatsApp"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          />
        </div>
      </Card>

      <div className="space-y-3.5">
        {pageItems.map((cliente) => {
          const historico = agendamentos.filter((item) => item.cliente_id === cliente.id);
          const whatsapp = formatWhatsApp(clienteWhatsApp(cliente));
          return (
            <Card key={cliente.id} className="overflow-hidden rounded-[1.55rem] !p-0 shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
              <button className="block w-full px-5 pb-4 pt-5 text-left transition active:bg-zinc-50" onClick={() => setSelected(cliente)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm">
                      <Phone size={18} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-[1.08rem] font-black tracking-[-0.035em] text-zinc-950">{cliente.nome}</h3>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-500">{whatsapp || "Sem WhatsApp"}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-black text-zinc-600">{historico.length} ag.</span>
                </div>
                {historico.length ? (
                  <div className="mt-4 rounded-2xl bg-zinc-50 px-3.5 py-2.5 text-xs font-bold text-zinc-500">
                    Último horário: <span className="text-zinc-800">{historico[0]?.data} às {historico[0]?.hora_inicio.slice(0, 5)}</span>
                  </div>
                ) : null}
              </button>
              <div className="border-t border-zinc-100 px-4 py-3">
                <Button className="h-10 w-full rounded-xl px-3 text-sm" variant="secondary" onClick={() => setEditing(cliente)}>
                  <Edit3 size={15} />
                  Editar dados
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length > PAGE_SIZE ? (
        <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] bg-white p-2 shadow-sm ring-1 ring-zinc-200">
          <Button className="rounded-xl" variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
          <Button className="rounded-xl" variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Próxima</Button>
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
  const whatsapp = formatWhatsApp(clienteWhatsApp(cliente));

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
            <p className="mt-2 text-sm font-semibold text-zinc-300">{whatsapp || "Sem WhatsApp"}</p>
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
          <div>WhatsApp: {whatsapp || "Sem WhatsApp"}</div>
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
  const [whatsapp, setWhatsapp] = useState(formatWhatsApp(initial?.whatsapp || initial?.telefone || ""));
  const [observacoes, setObservacoes] = useState(initial?.observacoes || "");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onSubmit({ nome, telefone: whatsappDigits(whatsapp), observacoes });
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Nome"><Input required value={nome} onChange={(event) => setNome(event.target.value)} /></Field>
      <Field label="WhatsApp"><Input inputMode="tel" autoComplete="tel" maxLength={15} value={whatsapp} onChange={(event) => setWhatsapp(formatWhatsApp(event.target.value))} placeholder="(67) 99999-9999" /></Field>
      <Field label="Observacoes"><Textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} /></Field>
      <Button loading={loading}>Salvar cliente</Button>
    </form>
  );
}
