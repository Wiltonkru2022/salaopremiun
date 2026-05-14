import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-4">
          <div>
            <h3 className="text-[1.35rem] font-bold">SalãoPremium</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Plataforma para salões, barbearias, clínicas e studios que desejam
              gestão forte no computador, app cliente, app profissional e um
              fluxo comercial pronto para vender.
            </p>
          </div>

          <div>
            <h4 className="text-base font-bold">Plataforma</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-zinc-500">
              <li>
                <Link href="/#sistema" className="hover:text-zinc-950">
                  Sistema para salão
                </Link>
              </li>
              <li>
                <Link href="/#apps" className="hover:text-zinc-950">
                  Apps cliente e profissional
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
            <h4 className="text-base font-bold">Acessos</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-zinc-500">
              <li>
                <Link href="/login" className="hover:text-zinc-950">
                  Login salão
                </Link>
              </li>
              <li>
                <Link href="https://app.salaopremiun.com.br/app-cliente/login" className="hover:text-zinc-950">
                  App cliente
                </Link>
              </li>
              <li>
                <Link href="/app-profissional/login" className="hover:text-zinc-950">
                  App profissional
                </Link>
              </li>
              <li>
                <Link href="/cadastro-salao" className="hover:text-zinc-950">
                  Cadastrar salão
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-base font-bold">Contato</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-zinc-500">
              <li>
                <a href="https://wa.me/5567984341742" className="hover:text-zinc-950">
                  WhatsApp: (67) 98434-1742
                </a>
              </li>
              <li>Atendimento comercial e suporte em PT-BR</li>
              <li>
                <Link href="/politica-de-privacidade" className="hover:text-zinc-950">
                  Política de privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos-de-uso" className="hover:text-zinc-950">
                  Termos de uso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-200 pt-5 text-sm text-zinc-500">
          Criado por WILTON KRUSZCIAKO. 2026 SalãoPremium. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
