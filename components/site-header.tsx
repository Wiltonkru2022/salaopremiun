"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Sparkles } from "lucide-react";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2c0a45] text-white shadow-md">
            <Sparkles size={20} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              SalaoPremium
            </h1>
            <p className="text-xs text-zinc-500">
              Gestão profissional para salões
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            href="/#sistema"
            className="text-sm font-medium text-zinc-700 transition hover:text-[#2c0a45]"
          >
            Sistema
          </Link>
          <Link
            href="/#app-profissional"
            className="text-sm font-medium text-zinc-700 transition hover:text-[#2c0a45]"
          >
            App Profissional
          </Link>
          <Link
            href="/#app-cliente"
            className="text-sm font-medium text-zinc-700 transition hover:text-[#2c0a45]"
          >
            App Cliente
          </Link>
          <Link
            href="/#planos"
            className="text-sm font-medium text-zinc-700 transition hover:text-[#2c0a45]"
          >
            Planos
          </Link>
          <Link
            href="/#suporte"
            className="text-sm font-medium text-zinc-700 transition hover:text-[#2c0a45]"
          >
            Suporte
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Entrar
          </Link>

          <Link
            href="/#cta-final"
            className="rounded-full bg-[#2c0a45] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
          >
            Assinar agora
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900 lg:hidden"
          aria-label="Abrir menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-6 py-5">
            <Link
              href="/#sistema"
              className="border-b border-zinc-100 py-4 text-base font-medium text-zinc-800"
              onClick={() => setOpen(false)}
            >
              Sistema para salão
            </Link>
            <Link
              href="/#app-profissional"
              className="border-b border-zinc-100 py-4 text-base font-medium text-zinc-800"
              onClick={() => setOpen(false)}
            >
              App profissional
            </Link>
            <Link
              href="/#app-cliente"
              className="border-b border-zinc-100 py-4 text-base font-medium text-zinc-800"
              onClick={() => setOpen(false)}
            >
              App cliente
            </Link>
            <Link
              href="/#planos"
              className="border-b border-zinc-100 py-4 text-base font-medium text-zinc-800"
              onClick={() => setOpen(false)}
            >
              Planos
            </Link>
            <Link
              href="/#suporte"
              className="border-b border-zinc-100 py-4 text-base font-medium text-zinc-800"
              onClick={() => setOpen(false)}
            >
              Suporte
            </Link>
            <Link
              href="/quem-somos"
              className="border-b border-zinc-100 py-4 text-base font-medium text-zinc-800"
              onClick={() => setOpen(false)}
            >
              Quem somos
            </Link>
            <Link
              href="/termos-de-uso"
              className="border-b border-zinc-100 py-4 text-base font-medium text-zinc-800"
              onClick={() => setOpen(false)}
            >
              Termos de uso
            </Link>
            <Link
              href="/politica-de-privacidade"
              className="py-4 text-base font-medium text-zinc-800"
              onClick={() => setOpen(false)}
            >
              Política de privacidade
            </Link>

            <div className="mt-5 grid gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
                onClick={() => setOpen(false)}
              >
                Entrar
              </Link>

              <Link
                href="/#cta-final"
                className="inline-flex items-center justify-center rounded-full bg-[#2c0a45] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
                onClick={() => setOpen(false)}
              >
                Assinar agora
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}