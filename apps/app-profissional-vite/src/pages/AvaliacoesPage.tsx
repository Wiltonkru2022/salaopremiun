import { ShieldAlert, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal, ModalActionBar } from "../components/ui/Modal";
import type { Avaliacao } from "../types/database";

const PAGE_SIZE = 8;
const blockedWords = [
  "puta",
  "puto",
  "merda",
  "caralho",
  "porra",
  "buceta",
  "cacete",
  "desgraca",
  "desgraça",
  "arrombado",
  "fdp",
  "vagabunda",
  "vagabundo"
];

function hasBadLanguage(text?: string | null) {
  if (!text) return false;
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return blockedWords.some((word) => normalized.includes(word.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={18} fill={index < value ? "currentColor" : "none"} />
      ))}
    </div>
  );
}

export function AvaliacoesPage({
  avaliacoes,
  onDelete
}: {
  avaliacoes: Avaliacao[];
  onDelete: (id: string) => Promise<void>;
}) {
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Avaliacao | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const average = useMemo(() => {
    if (!avaliacoes.length) return 0;
    return avaliacoes.reduce((acc, item) => acc + Number(item.nota || 0), 0) / avaliacoes.length;
  }, [avaliacoes]);

  const totalPages = Math.max(1, Math.ceil(avaliacoes.length / PAGE_SIZE));
  const pageItems = avaliacoes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function remove() {
    if (!pendingDelete || deletingId) return;
    setDeletingId(pendingDelete.id);
    setError("");
    try {
      await onDelete(pendingDelete.id);
      setPage(1);
      setPendingDelete(null);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Não foi possível excluir a avaliação.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 text-white">
        <Stars value={Math.round(average)} />
        <h2 className="mt-5 text-3xl font-black tracking-[-0.06em]">{average ? average.toFixed(1) : "0.0"}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">
          {avaliacoes.length} avaliações recebidas pelo app cliente.
        </p>
      </Card>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Avaliações</h2>
            <p className="text-sm font-bold text-zinc-500">Comentários ofensivos ficam protegidos para revisão.</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">
            {page}/{totalPages}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {pageItems.length ? (
            pageItems.map((item) => {
              const blocked = hasBadLanguage(item.comentario);
              return (
                <div key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Stars value={Number(item.nota || 0)} />
                      <div className="mt-2 truncate text-base font-black">{item.cliente_nome || "Cliente"}</div>
                      <div className="text-xs font-bold text-zinc-500">
                        {item.servico_nome || "Serviço"} - {item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR") : "Sem data"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      className="h-10 px-3"
                      disabled={Boolean(deletingId)}
                      onClick={() => {
                        setError("");
                        setPendingDelete(item);
                      }}
                      aria-label={`Excluir avaliação de ${item.cliente_nome || "cliente"}`}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>

                  {blocked ? (
                    <div className="mt-3 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                      <ShieldAlert size={18} />
                      Comentário oculto por conter palavra ofensiva.
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-semibold leading-6 text-zinc-700">
                      {item.comentario || "Cliente avaliou sem comentário."}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">
              Nenhuma avaliação recebida ainda.
            </div>
          )}
        </div>

        {avaliacoes.length > PAGE_SIZE ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Anterior
            </Button>
            <Button type="button" variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Próxima
            </Button>
          </div>
        ) : null}
      </Card>

      <Modal
        title="Excluir avaliação"
        subtitle="Essa ação remove a avaliação da lista do profissional."
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deletingId) setPendingDelete(null);
        }}
      >
        <p className="text-sm font-semibold leading-6 text-zinc-600">
          Deseja excluir a avaliação de <strong>{pendingDelete?.cliente_nome || "Cliente"}</strong>?
        </p>
        <ModalActionBar>
          <Button type="button" variant="secondary" disabled={Boolean(deletingId)} onClick={() => setPendingDelete(null)}>
            Voltar
          </Button>
          <Button type="button" variant="danger" loading={Boolean(deletingId)} onClick={() => void remove()}>
            Excluir avaliação
          </Button>
        </ModalActionBar>
      </Modal>
    </div>
  );
}
