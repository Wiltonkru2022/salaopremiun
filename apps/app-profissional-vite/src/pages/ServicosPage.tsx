import { FormEvent, useState } from "react";
import { Clock3, Edit3, Plus, Search } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input, Textarea } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { durationLabel, money } from "../lib/date";
import type { Servico } from "../types/database";

type Payload = Pick<Servico, "nome" | "preco" | "duracao_minutos">;
const PAGE_SIZE = 10;

export function ServicosPage({ servicos, onSave, onEdit }: { servicos: Servico[]; onSave: (payload: Payload) => Promise<void>; onEdit?: (id: string, payload: Payload) => Promise<void> }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = servicos.filter((servico) => `${servico.nome} ${servico.descricao || ""}`.toLowerCase().includes(query.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setCreating(true)}>
        <Plus size={18} />
        Novo servico
      </Button>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Meus servicos</h2>
            <p className="text-sm font-bold text-zinc-500">Tempo exibido direto da tabela/vinculo salvo.</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{filtered.length}</span>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <Input className="pl-11" placeholder="Buscar servico" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </div>
      </Card>

      <div className="space-y-3">
        {pageItems.map((servico) => (
          <Card key={servico.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  <Clock3 size={14} />
                  {Number(servico.duracao_minutos || 0)} min - {durationLabel(servico.duracao_minutos)}
                </div>
                <h3 className="mt-1.5 text-lg font-black tracking-[-0.03em]">{servico.nome}</h3>
                <p className="mt-1 text-sm font-bold text-zinc-500">{servico.descricao || "Sem descricao."}</p>
              </div>
              <div className="text-right text-lg font-black">{money(servico.preco)}</div>
            </div>
            <Button className="mt-3 h-9 px-3" variant="secondary" onClick={() => setEditing(servico)}>
              <Edit3 size={15} />
              Editar servico
            </Button>
          </Card>
        ))}
      </div>

      {filtered.length > PAGE_SIZE ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
          <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Proxima</Button>
        </div>
      ) : null}

      <Modal title="Novo servico" open={creating} onClose={() => setCreating(false)}>
        <ServicoForm onSubmit={async (payload) => { await onSave(payload); setCreating(false); }} />
      </Modal>

      <Modal title="Editar servico" open={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing ? (
          <ServicoForm
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

function ServicoForm({ initial, onSubmit }: { initial?: Servico; onSubmit: (payload: Payload) => Promise<void> }) {
  const [nome, setNome] = useState(initial?.nome || "");
  const [preco, setPreco] = useState(String(initial?.preco ?? 0));
  const [duracao, setDuracao] = useState(String(initial?.duracao_minutos || 30));
  const [descricao, setDescricao] = useState(initial?.descricao || "");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await onSubmit({ nome, preco: Number(preco), duracao_minutos: Number(duracao || 0) });
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Nome"><Input required value={nome} onChange={(event) => setNome(event.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Preco"><Input inputMode="decimal" value={preco} onChange={(event) => setPreco(event.target.value)} /></Field>
        <Field label="Tempo em minutos"><Input type="number" min={1} step={1} value={duracao} onChange={(event) => setDuracao(event.target.value)} /></Field>
      </div>
      <Field label="Descricao"><Textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Opcional" /></Field>
      <Button loading={loading}>Salvar servico</Button>
    </form>
  );
}
