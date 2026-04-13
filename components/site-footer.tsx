import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-[#120d16] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-4">
          <div>
            <h3 className="text-2xl font-bold">SalaoPremium</h3>
            <p className="mt-4 leading-7 text-zinc-400">
              Plataforma para salões, barbearias, clínicas e studios que
              desejam gestão forte no computador e praticidade no celular para
              profissional e cliente.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-bold">Plataforma</h4>
            <ul className="mt-4 space-y-3 text-zinc-400">
              <li>
                <Link href="/#sistema" className="hover:text-white">
                  Sistema para salão
                </Link>
              </li>
              <li>
                <Link href="/#app-profissional" className="hover:text-white">
                  App profissional
                </Link>
              </li>
              <li>
                <Link href="/#app-cliente" className="hover:text-white">
                  App cliente
                </Link>
              </li>
              <li>
                <Link href="/#planos" className="hover:text-white">
                  Planos e preços
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold">Institucional</h4>
            <ul className="mt-4 space-y-3 text-zinc-400">
              <li>
                <Link href="/quem-somos" className="hover:text-white">
                  Quem somos
                </Link>
              </li>
              <li>
                <Link href="/termos-de-uso" className="hover:text-white">
                  Termos de uso
                </Link>
              </li>
              <li>
                <Link
                  href="/politica-de-privacidade"
                  className="hover:text-white"
                >
                  Política de privacidade
                </Link>
              </li>
              <li>
                <Link href="/#suporte" className="hover:text-white">
                  Suporte
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold">Contato</h4>
            <ul className="mt-4 space-y-3 text-zinc-400">
              <li>contato@seusistema.com.br</li>
              <li>(00) 00000-0000</li>
              <li>Atendimento comercial e suporte</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-sm text-zinc-500">
          © 2026 SalaoPremium. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}