import { redirect } from "next/navigation";
import Link from "next/link";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { listarComandasProfissional } from "@/app/services/profissional/comandas";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function getStatusClasses(status: string) {
  const s = String(status || "").toLowerCase();

  if (s === "aberta") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "aguardando_pagamento")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "fechada") return "bg-green-50 text-green-700 border-green-200";
  if (s === "cancelada") return "bg-red-50 text-red-700 border-red-200";

  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

export default async function ComandasPage() {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const comandas = await listarComandasProfissional(
    session.idSalao,
    session.idProfissional
  );

  return (
    <ProfissionalShell title="Comandas" subtitle="Abertas e atendimentos">
      <div className="space-y-3">
        {comandas.length ? (
          comandas.map((comanda) => (
            <Link
              key={comanda.id}
              href={`/app-profissional/comandas/${comanda.id}`}
            >
              <div className="rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-zinc-500">
                      Comanda #{comanda.numero}
                    </div>

                    <div className="mt-1 text-base font-semibold text-zinc-950">
                      {comanda.cliente_nome}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-zinc-950">
                      {formatarMoeda(comanda.total)}
                    </div>

                    <span
                      className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                        comanda.status
                      )}`}
                    >
                      {comanda.status}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[1.25rem] border border-zinc-200 bg-white p-4 text-sm text-zinc-500 shadow-sm">
            Nenhuma comanda encontrada.
          </div>
        )}
      </div>
    </ProfissionalShell>
  );
}