import { BellRing, CheckCircle2 } from "lucide-react";
import { Card } from "../components/ui/Card";
import type { Notificacao } from "../types/database";

export function NotificacoesPage({
  notificacoes,
  onRead,
}: {
  notificacoes: Notificacao[];
  onRead: (id: string) => Promise<void>;
}) {
  const unreadCount = notificacoes.filter((item) => !item.lida).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-[1.25rem] border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <div className="text-sm font-black text-zinc-950">
            {unreadCount ? `${unreadCount} não lida${unreadCount === 1 ? "" : "s"}` : "Tudo em dia"}
          </div>
          <div className="mt-0.5 text-xs font-bold text-zinc-400">
            Toque em um aviso novo para marcar como lido.
          </div>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-full ${unreadCount ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
          {unreadCount ? <BellRing size={20} /> : <CheckCircle2 size={20} />}
        </span>
      </div>

      {notificacoes.length ? (
        notificacoes.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={item.lida}
            onClick={() => void onRead(item.id)}
            className="block w-full text-left disabled:cursor-default"
            aria-label={item.lida ? `${item.titulo}, lida` : `${item.titulo}, marcar como lida`}
          >
            <Card
              className={
                item.lida
                  ? "opacity-70 transition"
                  : "border-amber-200 bg-amber-50 transition active:scale-[0.99]"
              }
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-amber-700 shadow-sm">
                  <BellRing size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-black tracking-[-0.03em] text-zinc-950">
                      {item.titulo}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                        item.lida
                          ? "bg-zinc-100 text-zinc-500"
                          : "bg-white text-amber-800 shadow-sm"
                      }`}
                    >
                      {item.lida ? "Lida" : "Nova"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-6 text-zinc-600">
                    {item.mensagem}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                      {new Date(item.created_at).toLocaleString("pt-BR")}
                    </p>
                    {!item.lida ? (
                      <span className="text-xs font-black text-amber-800">
                        Toque para marcar como lida
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          </button>
        ))
      ) : (
        <Card>
          <div className="py-8 text-center text-sm font-bold text-zinc-500">
            Nenhuma notificação por enquanto.
          </div>
        </Card>
      )}
    </div>
  );
}
