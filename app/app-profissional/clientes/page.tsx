import Link from "next/link";
import { redirect } from "next/navigation";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { listarClientesDoSalao } from "@/app/services/profissional/clientes";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

type SearchParams = Promise<{
  busca?: string;
}>;

type ClienteRow = {
  id: string;
  nome: string | null;
  telefone?: string | null;
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
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const { busca = "" } = await searchParams;
  const buscaLimpa = busca.trim();

  let data: ClienteRow[] = [];

  try {
    const clientesData = await listarClientesDoSalao(session.idSalao);
    data = clientesData.filter((cliente) => {
      if (!buscaLimpa) return true;
      return String(cliente.nome || "")
        .toLowerCase()
        .includes(buscaLimpa.toLowerCase());
    }) as ClienteRow[];
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
      <div className="space-y-4">
        <form
          method="GET"
          className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <input
            type="text"
            name="busca"
            defaultValue={buscaLimpa}
            placeholder="Buscar cliente..."
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          />
        </form>

        <Link
          href="/app-profissional/clientes/novo"
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-zinc-950 text-base font-semibold text-white shadow-sm"
        >
          + Cadastrar cliente
        </Link>

        <div className="space-y-3">
          {clientes.length === 0 ? (
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-5 text-center text-sm text-zinc-500 shadow-sm">
              {buscaLimpa
                ? "Nenhum cliente encontrado para essa busca."
                : "Nenhum cliente cadastrado neste salao."}
            </div>
          ) : (
            clientes.map((cliente) => (
              <Link
                key={cliente.id}
                href={`/app-profissional/clientes/novo?cliente_id=${cliente.id}`}
                className="block rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm transition active:scale-[0.99]"
              >
                <div className="text-[1.05rem] font-semibold text-zinc-950">
                  {cliente.nome || "Cliente"}
                </div>

                <div className="mt-1 text-sm text-zinc-500">
                  {formatTelefone(cliente.telefone)}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </ProfissionalShell>
  );
}
