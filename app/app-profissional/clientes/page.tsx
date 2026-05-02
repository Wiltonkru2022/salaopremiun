import Link from "next/link";
import { Search, UserPlus2, UsersRound } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalEmptyState from "@/components/profissional/ui/ProfissionalEmptyState";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { listarClientesDoSalao } from "@/app/services/profissional/clientes";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

type SearchParams = Promise<{
  busca?: string;
}>;

type ClienteRow = {
  id: string;
  nome: string | null;
  telefone?: string | null;
  email?: string | null;
  ativo?: boolean | string | number | null;
  status?: string | null;
};

function formatTelefone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "Sem telefone";

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return value || "Sem telefone";
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireProfissionalAppContext();
  const { busca = "" } = await searchParams;
  const buscaLimpa = busca.trim();

  let data: ClienteRow[] = [];

  try {
    data = (await listarClientesDoSalao(session.idSalao, {
      busca: buscaLimpa,
      limit: 60,
    })) as ClienteRow[];
  } catch {
    return (
      <ProfissionalShell title="Clientes" subtitle="Cadastros do salao">
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          Nao foi possivel carregar os clientes.
        </div>
      </ProfissionalShell>
    );
  }

  const clientes = data.filter((item) => {
    const ativo =
      item.ativo === true || item.ativo === "true" || item.ativo === 1;
    const status = String(item.status || "").toLowerCase();

    return ativo && status !== "inativo";
  });

  return (
    <ProfissionalShell title="Clientes" subtitle="Cadastros do salao">
      <div className="space-y-3.5">
        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                <UsersRound size={14} />
                Base do profissional
              </div>

              <h2 className="mt-3 text-[1.45rem] font-black tracking-[-0.04em] leading-none">
                {clientes.length} clientes
              </h2>

              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                Busque rapido, abra o cadastro e siga para agendamento ou comanda.
              </p>
            </div>

            <Link
              href="/app-profissional/clientes/novo"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-950"
              aria-label="Cadastrar cliente"
            >
              <UserPlus2 size={18} />
            </Link>
          </div>
        </section>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Buscar cliente"
            description="Procure por nome, telefone ou email."
          />

          <form method="GET" className="space-y-3">
            <div className="flex items-center gap-2 rounded-[1.15rem] border border-zinc-200 bg-zinc-50 px-3">
              <Search size={16} className="shrink-0 text-zinc-400" />
              <input
                type="text"
                name="busca"
                defaultValue={buscaLimpa}
                placeholder="Buscar cliente"
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <Link
              href="/app-profissional/clientes/novo"
              className="flex h-11 w-full items-center justify-center rounded-[18px] bg-zinc-950 text-sm font-bold text-white"
            >
              Cadastrar cliente
            </Link>
          </form>
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Lista de clientes"
            description={
              buscaLimpa
                ? `Resultados para "${buscaLimpa}".`
                : "Clientes ativos mais recentes para voce acessar rapido."
            }
          />

          {clientes.length === 0 ? (
            <ProfissionalEmptyState
              title={
                buscaLimpa
                  ? "Nenhum cliente encontrado"
                  : "Nenhum cliente cadastrado"
              }
              description={
                buscaLimpa
                  ? "Tente outro nome, telefone ou email."
                  : "Cadastre um cliente para comecar a usar agenda e comandas."
              }
              action={
                <Link
                  href="/app-profissional/clientes/novo"
                  className="inline-flex h-10 items-center justify-center rounded-[18px] bg-zinc-950 px-4 text-sm font-bold text-white"
                >
                  Novo cliente
                </Link>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {clientes.map((cliente) => (
                <Link
                  key={cliente.id}
                  href={`/app-profissional/clientes/${cliente.id}`}
                  className="block rounded-[1.25rem] border border-zinc-200 bg-zinc-50/70 p-3.5 transition active:scale-[0.99]"
                >
                  <div className="break-words text-base font-bold tracking-[-0.02em] text-zinc-950">
                    {cliente.nome || "Cliente"}
                  </div>

                  <div className="mt-1.5 break-words text-sm text-zinc-500">
                    {formatTelefone(cliente.telefone)}
                  </div>

                  <div className="mt-1 break-all text-sm text-zinc-400">
                    {cliente.email || "Sem email"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ProfissionalSurface>
      </div>
    </ProfissionalShell>
  );
}
