type Props = {
  totalEmAberto: number;
};

export default function CaixaHeader({ totalEmAberto }: Props) {
  return (
    <div className="rounded-[32px] bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-800 p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>

          <h1 className="mt-2 text-3xl font-bold">Caixa</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Controle de cobrança, pagamentos, fechamento da comanda, comissão e estoque.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            Em aberto
          </div>
          <div className="mt-1 text-2xl font-bold">{totalEmAberto}</div>
        </div>
      </div>
    </div>
  );
}