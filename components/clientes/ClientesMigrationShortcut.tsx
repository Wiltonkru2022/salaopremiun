"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClientesMigrationShortcut() {
  const pathname = usePathname();

  if (pathname !== "/clientes") return null;

  return (
    <div className="mx-auto mb-4 max-w-7xl">
      <div className="flex flex-col gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            App Cliente
          </div>
          <div className="mt-1 text-base font-black text-amber-950">
            Atualização para CPF + data de nascimento
          </div>
          <p className="mt-1 text-sm leading-5 text-amber-900/80">
            Gere links seguros para clientes que ainda precisam atualizar o acesso ao App Cliente.
          </p>
        </div>
        <Link
          href="/clientes/migracao-acesso"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-800"
        >
          Atualizar App Cliente
        </Link>
      </div>
    </div>
  );
}
