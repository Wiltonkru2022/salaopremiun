import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-4">
          <div>
            <h3 className="text-[1.35rem] font-bold">SalaoPremium</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Plataforma para saloes, barbearias, clinicas e studios que desejam
              gestao forte no computador, praticidade no celular para o
              profissional e um fluxo comercial pronto para vender.
            </p>
          </div>

          <div>
            <h4 className="text-base font-bold">Plataforma</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-zinc-500">
              <li>
                <Link href="/#sistema" className="hover:text-zinc-950">
                  Sistema para salao
                </Link>
              </li>
              <li>
                <Link href="/#app-profissional" className="hover:text-zinc-950">
                  App profissional
                </Link>
              </li>
              <li>
                <Link href="/#comercial" className="hover:text-zinc-950">
                  Comercial
                </Link>
              </li>
              <li>
                <Link href="/#planos" className="hover:text-zinc-950">
                  Planos e precos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-base font-bold">Institucional</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-zinc-500">
              <li>
                <Link href="/quem-somos" className="hover:text-zinc-950">
                  Quem somos
                </Link>
              </li>
              <li>
                <Link href="/termos-de-uso" className="hover:text-zinc-950">
                  Termos de uso
                </Link>
              </li>
              <li>
                <Link
                  href="/politica-de-privacidade"
                  className="hover:text-zinc-950"
                >
                  Politica de privacidade
                </Link>
              </li>
              <li>
                <Link href="/#suporte" className="hover:text-zinc-950">
                  Suporte
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-base font-bold">Contato</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-zinc-500">
              <li>contato@seusistema.com.br</li>
              <li>(00) 00000-0000</li>
              <li>Atendimento comercial e suporte</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-200 pt-5 text-sm text-zinc-500">
          © 2026 SalaoPremium. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
