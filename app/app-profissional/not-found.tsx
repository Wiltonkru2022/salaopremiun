import Link from "next/link";

export default function AppProfissionalNotFound() {
  return (
    <main className="min-h-dvh bg-[#f7f7f5] px-5 py-8 text-zinc-950">
      <section className="mx-auto flex min-h-[72dvh] max-w-md flex-col justify-center">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-7 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a5a1f]">
            Salão Premium Profissional
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight">
            Página não encontrada
          </h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            Esse link do app profissional não existe mais. Volte para o início
            ou para a agenda.
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              href="/app-profissional/inicio"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white"
            >
              Ir para o início
            </Link>
            <Link
              href="/app-profissional/agenda"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-900"
            >
              Abrir agenda
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
