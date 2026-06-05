import { BellRing } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { Notificacao } from "../types/database";

export function NotificacoesPage({ notificacoes, onRead }: { notificacoes: Notificacao[]; onRead: (id: string) => Promise<void> }) {
  return (
    <div className="space-y-3">
      {notificacoes.length ? (
        notificacoes.map((item) => (
          <Card key={item.id} className={item.lida ? "opacity-70" : "border-amber-200 bg-amber-50"}>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-amber-700 shadow-sm">
                <BellRing size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black tracking-[-0.03em]">{item.titulo}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-zinc-600">{item.mensagem}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{new Date(item.created_at).toLocaleString("pt-BR")}</p>
              </div>
            </div>
            {!item.lida ? (
              <Button className="mt-3 h-9 px-3" variant="secondary" onClick={() => onRead(item.id)}>
                Marcar como lida
              </Button>
            ) : null}
          </Card>
        ))
      ) : (
        <Card>
          <div className="py-8 text-center text-sm font-bold text-zinc-500">Nenhuma notificacao por enquanto.</div>
        </Card>
      )}
    </div>
  );
}
