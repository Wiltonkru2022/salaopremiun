import Link from "next/link";

export const metadata = {
  title: "Salão excluído",
};

export default function SalaoExcluidoPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center">
        <section className="w-full rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30 sm:p-10">
          <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-amber-100">
            Conta encerrada
          </div>

          <h1 className="mt-6 font-display text-4xl font-black tracking-tight sm:text-5xl">
            Que pena que você nos deixou.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
            O salão foi excluído com segurança. Se quiser voltar, nossa equipe
            pode ajudar a reativar seu salão e orientar os próximos passos.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-12 items-center rounded-2xl bg-white px-5 text-sm font-black text-zinc-950 transition hover:-translate-y-0.5"
            >
              Voltar para o site
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-2xl border border-white/15 px-5 text-sm font-black text-white transition hover:bg-white/10"
            >
              Acessar outra conta
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
