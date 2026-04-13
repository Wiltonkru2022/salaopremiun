export default function AssinaturaHero() {
  return (
    <section className="overflow-hidden rounded-[34px] border border-violet-200 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_30%),linear-gradient(135deg,#4c1d95_0%,#6d28d9_45%,#7c3aed_70%,#8b5cf6_100%)] px-6 py-8 text-white shadow-sm md:px-8 md:py-10">
      <div className="max-w-4xl">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-100">
          Assinatura SalaoPremium
        </div>

        <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          Escolha seu plano e mantenha seu salão sempre liberado
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-violet-100 md:text-base">
          Controle seu teste grátis, acompanhe vencimento e gere cobrança por
          PIX, boleto ou cartão sem sair da página.
        </p>
      </div>
    </section>
  );
}