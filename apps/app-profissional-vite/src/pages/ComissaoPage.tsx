import { CircleDollarSign, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { money } from "../lib/date";
import type { ComissaoLancamento } from "../types/database";

type StatusFiltro = "todos" | "pendente" | "pago";

export function ComissaoPage({ comissoes }: { comissoes: ComissaoLancamento[] }) {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState<StatusFiltro>("todos");

  const filtradas = useMemo(() => {
    return comissoes.filter((item) => {
      const itemMes = item.competenciaData?.slice(0, 7);
      const matchMes = !mes || itemMes === mes;
      const matchStatus = status === "todos" || item.status === status;
      return matchMes && matchStatus;
    });
  }, [comissoes, mes, status]);

  const pendente = filtradas
    .filter((item) => item.status !== "pago")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const pago = filtradas
    .filter((item) => item.status === "pago")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const total = pendente + pago;

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Comissao por mes</h2>
            <p className="text-sm font-bold text-zinc-500">Somente comissoes geradas no caixa entram aqui.</p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="month"
              value={mes}
              onChange={(event) => setMes(event.target.value)}
              className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 font-bold outline-none focus:border-zinc-950"
            />
            <button
              type="button"
              onClick={() => setMes("")}
              className="h-12 rounded-2xl border border-zinc-200 px-4 text-sm font-black"
            >
              Todos
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-zinc-100 p-1">
            {(["todos", "pendente", "pago"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={`h-10 rounded-xl text-sm font-black capitalize ${
                  status === option ? "bg-zinc-950 text-white" : "text-zinc-600"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-zinc-950 text-white">
          <Wallet className="text-amber-300" size={22} />
          <div className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Total</div>
          <div className="mt-1 text-xl font-black tracking-[-0.05em]">{money(total)}</div>
        </Card>
        <Card>
          <CircleDollarSign className="text-yellow-600" size={22} />
          <div className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Pendente</div>
          <div className="mt-1 text-xl font-black tracking-[-0.05em]">{money(pendente)}</div>
        </Card>
        <Card>
          <TrendingUp className="text-emerald-600" size={22} />
          <div className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Pago</div>
          <div className="mt-1 text-xl font-black tracking-[-0.05em]">{money(pago)}</div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-black tracking-[-0.04em]">Comissoes geradas</h2>
        <div className="mt-4 space-y-2.5">
          {filtradas.length ? (
            filtradas.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">{item.descricao}</div>
                  <div className="text-xs font-bold text-zinc-500">
                    {item.competenciaData || "Sem data"} - {item.status}
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-sm font-black ${item.status === "pago" ? "text-emerald-700" : "text-yellow-700"}`}>
                  <CircleDollarSign size={16} />
                  {money(item.valor)}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm font-bold text-zinc-500">
              Nenhuma comissao nesse filtro.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
