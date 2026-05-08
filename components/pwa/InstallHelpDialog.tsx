"use client";

import { MonitorDown, Pointer, X } from "lucide-react";

export default function InstallHelpDialog({
  area = "SalaoPremium",
  onClose,
  open,
}: {
  area?: string;
  onClose: () => void;
  open: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[460] flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-[26px] border border-white/80 bg-white p-5 text-zinc-950 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <MonitorDown size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Atalho no PC
              </p>
              <h2 className="text-xl font-black tracking-tight">
                Instalar {area}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
            aria-label="Fechar ajuda de instalacao"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-600">
          <p>
            Se o botao de instalar ainda nao apareceu, use o atalho do Chrome na
            barra do navegador.
          </p>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-zinc-950">
              <Pointer size={17} />
              No Chrome do computador
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs font-semibold leading-5 text-zinc-600">
              <li>Clique no icone de instalar na barra de endereco.</li>
              <li>Se nao aparecer, abra o menu de tres pontos.</li>
              <li>Escolha Salvar e compartilhar ou Instalar SalaoPremium.</li>
              <li>Confirme em Instalar.</li>
            </ol>
          </div>
          <p className="text-xs font-semibold text-zinc-500">
            O navegador libera a instalacao quando a pagina esta em HTTPS, com
            manifest valido e service worker ativo. Atualize a pagina se acabou
            de abrir agora.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800"
        >
          Entendi
        </button>
      </section>
    </div>
  );
}
