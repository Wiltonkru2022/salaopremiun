import { ShieldAlert, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const average = useMemo(() => {
    if (!avaliacoes.length) return 0;
    return avaliacoes.reduce((acc, item) => acc + Number(item.nota || 0), 0) / avaliacoes.length;
  }, [avaliacoes]);

  const totalPages = Math.max(1, Math.ceil(avaliacoes.length / PAGE_SIZE));
  const pageItems = avaliacoes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await onDelete(id);
      setPage(1);
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
          {avaliacoes.length} avaliacoes recebidas pelo app cliente.
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Avaliacoes</h2>
            <p className="text-sm font-bold text-zinc-500">Comentarios ofensivos ficam protegidos para revisao.</p>
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
                        {item.servico_nome || "Servico"} - {item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR") : "Sem data"}
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      className="h-10 px-3"
                      loading={deletingId === item.id}
                      onClick={() => remove(item.id)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>

                  {blocked ? (
                    <div className="mt-3 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                      <ShieldAlert size={18} />
                      Comentario oculto por conter palavra ofensiva.
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-semibold leading-6 text-zinc-700">
                      {item.comentario || "Cliente avaliou sem comentario."}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">
              Nenhuma avaliacao recebida ainda.
            </div>
          )}
        </div>

        {avaliacoes.length > PAGE_SIZE ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Anterior
            </Button>
            <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Proxima
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
