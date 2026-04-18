import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-4">
          <div>
            <h3 className="text-2xl font-bold">SalaoPremium</h3>
            <p className="mt-4 leading-7 text-zinc-500">
              Plataforma para salões, barbearias, clínicas e studios que
              desejam gestão forte no computador, praticidade no celular para o
              profissional e um fluxo comercial pronto para vender.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-bold">Plataforma</h4>
            <ul className="mt-4 space-y-3 text-zinc-500">
              <li>
                <Link href="/#sistema" className="hover:text-zinc-950">
                  Sistema para salão
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
                  Planos e preços
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold">Institucional</h4>
            <ul className="mt-4 space-y-3 text-zinc-500">
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
                  Política de privacidade
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
            <h4 className="text-lg font-bold">Contato</h4>
            <ul className="mt-4 space-y-3 text-zinc-500">
              <li>contato@seusistema.com.br</li>
              <li>(00) 00000-0000</li>
              <li>Atendimento comercial e suporte</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
          © 2026 SalaoPremium. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
