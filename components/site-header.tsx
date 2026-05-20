"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, MessageCircle, Sparkles, X } from "lucide-react";

const LOGIN_SALAO_URL = "https://login.salaopremiun.com.br/login";
const CADASTRO_SALAO_URL = "https://cadastro.salaopremiun.com.br/cadastro-salao";
const APP_CLIENTE_URL = "https://app.salaopremiun.com.br/app-cliente/login";
const APP_PROFISSIONAL_URL =
  "https://app.salaopremiun.com.br/app-profissional/login";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4 lg:px-10">
        <a href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2c0a45] text-white shadow-md">
            <Sparkles size={18} />
          </div>

          <div>
            <h1 className="text-[1.35rem] font-bold tracking-tight text-zinc-950">
              SalãoPremium
            </h1>
            <p className="text-[11px] text-zinc-500">
              Gestão profissional para salões
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-1 rounded-full border border-zinc-200/70 bg-zinc-50/80 p-1 lg:flex">
          <Link href="/#sistema" className="rounded-full px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-white hover:text-[#2c0a45] hover:shadow-sm">
            Sistema
          </Link>
          <Link href="/#apps" className="rounded-full px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-white hover:text-[#2c0a45] hover:shadow-sm">
            Apps
          </Link>
          <Link href="/#google" className="rounded-full px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-white hover:text-[#2c0a45] hover:shadow-sm">
            Google
          </Link>
          <Link href="/#planos" className="rounded-full px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-white hover:text-[#2c0a45] hover:shadow-sm">
            Planos
          </Link>
          <Link href="/#suporte" className="rounded-full px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-white hover:text-[#2c0a45] hover:shadow-sm">
            Suporte
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href={LOGIN_SALAO_URL} className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-black text-zinc-900 transition hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50">
            Login do salão
          </a>
          <a href={CADASTRO_SALAO_URL} className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 py-2 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-zinc-800">
            Cadastrar salão
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900 lg:hidden"
          aria-label="Abrir menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-zinc-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-6 py-4">
            <MobileLink href="/#sistema" onClick={() => setOpen(false)}>
              Sistema para salão
            </MobileLink>
            <MobileLink href="/#apps" onClick={() => setOpen(false)}>
              Apps cliente e profissional
            </MobileLink>
            <MobileLink href="/#google" onClick={() => setOpen(false)}>
              Integrações Google
            </MobileLink>
            <MobileLink href="/#planos" onClick={() => setOpen(false)}>
              Planos
            </MobileLink>
            <MobileLink href="/#suporte" onClick={() => setOpen(false)}>
              Suporte
            </MobileLink>
            <MobileLink href="/quem-somos" onClick={() => setOpen(false)}>
              Quem somos
            </MobileLink>
            <MobileLink href="/termos-de-uso" onClick={() => setOpen(false)}>
              Termos de uso
            </MobileLink>
            <Link
              href="/politica-de-privacidade"
              className="py-3.5 text-base font-medium text-zinc-800"
              onClick={() => setOpen(false)}
            >
              Política de privacidade
            </Link>

            <div className="mt-4 grid gap-3">
              <a href={LOGIN_SALAO_URL} className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-black text-zinc-900 transition hover:bg-zinc-100" onClick={() => setOpen(false)}>
                Login do salão
              </a>
              <a href={APP_CLIENTE_URL} className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-black text-zinc-900 transition hover:bg-zinc-100" onClick={() => setOpen(false)}>
                App cliente
              </a>
              <a href={APP_PROFISSIONAL_URL} className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-black text-zinc-900 transition hover:bg-zinc-100" onClick={() => setOpen(false)}>
                App profissional
              </a>
              <a href={CADASTRO_SALAO_URL} className="inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:bg-zinc-800" onClick={() => setOpen(false)}>
                Cadastrar salão
              </a>
              <a href="https://wa.me/5567984341742" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700" onClick={() => setOpen(false)}>
                <MessageCircle size={16} />
                WhatsApp suporte
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border-b border-zinc-100 py-3.5 text-base font-medium text-zinc-800"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
