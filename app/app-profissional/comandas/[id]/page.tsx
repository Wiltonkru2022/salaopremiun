import { randomUUID } from "node:crypto";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  adicionarExtraNaComandaAction,
  adicionarServicoNaComandaAction,
  enviarComandaParaCaixaAction,
  excluirItemDaComandaAction,
} from "./actions";

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

function traduzirTipoItem(tipo: string | null | undefined) {
  const valor = String(tipo || "").toLowerCase();
  if (valor === "servico") return "Serviço";
  if (valor === "extra") return "Item extra";
  if (valor === "produto") return "Produto";
  return "Item";
}

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ ok?: string; erro?: string }>;

type ComandaItemRow = {
  id: string;
  descricao?: string | null;
  quantidade?: number | string | null;
  valor_unitario?: number | string | null;
  valor_total?: number | string | null;
  tipo_item?: string | null;
};

type ServicoOption = {
  id: string;
  nome: string;
  preco?: number | string | null;
  preco_padrao?: number | string | null;
};

type ExtraOption = {
  id: string;
  nome: string;
  preco_venda?: number | string | null;
  ativo?: boolean | null;
};

export default async function ComandaDetalhePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const session = await requireProfissionalAppContext();

  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const {
    comanda,
    comandaError,
    acessoCount,
    acessoError,
    cliente,
    itens,
    itensError,
    servicos,
    servicosError,
    extrasRaw,
    extrasError,
  } = await runAdminOperation({
    action: "app_profissional_comanda_detalhe_page",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabaseAdmin) => {
      const { data: comandaData, error: comandaLoadError } =
        await supabaseAdmin
          .from("comandas")
          .select("id, numero, id_cliente, status, subtotal, desconto, total")
          .eq("id", id)
          .eq("id_salao", session.idSalao)
          .maybeSingle();

      if (comandaLoadError || !comandaData) {
        return {
          comanda: comandaData,
          comandaError: comandaLoadError,
          acessoCount: null,
          acessoError: null,
          cliente: null,
          itens: null,
          itensError: null,
          servicos: null,
          servicosError: null,
          extrasRaw: null,
          extrasError: null,
        };
      }

      const { count: acessoLoadCount, error: acessoLoadError } =
        await supabaseAdmin
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", session.idProfissional)
          .eq("id_comanda", id);

      if (acessoLoadError || !acessoLoadCount) {
        return {
          comanda: comandaData,
          comandaError: null,
          acessoCount: acessoLoadCount,
          acessoError: acessoLoadError,
          cliente: null,
          itens: null,
          itensError: null,
          servicos: null,
          servicosError: null,
          extrasRaw: null,
          extrasError: null,
        };
      }

      const [
        clienteResult,
        itensResult,
        servicosResult,
        extrasResult,
      ] = await Promise.all([
        comandaData.id_cliente
          ? supabaseAdmin
              .from("clientes")
              .select("id, nome, telefone")
              .eq("id", comandaData.id_cliente)
              .eq("id_salao", session.idSalao)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabaseAdmin
          .from("comanda_itens")
          .select(
            "id, descricao, quantidade, valor_unitario, valor_total, tipo_item, id_servico, id_item_extra, ativo, created_at"
          )
          .eq("id_comanda", id)
          .eq("id_salao", session.idSalao)
          .eq("ativo", true)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("servicos")
          .select("id, nome, preco, preco_padrao, ativo, status")
          .eq("id_salao", session.idSalao)
          .eq("ativo", true)
          .eq("status", "ativo")
          .order("nome", { ascending: true }),
        supabaseAdmin
          .from("itens_extras")
          .select("id, id_salao, nome, preco_venda, ativo")
          .eq("id_salao", session.idSalao)
          .order("nome", { ascending: true }),
      ]);

      return {
        comanda: comandaData,
        comandaError: null,
        acessoCount: acessoLoadCount,
        acessoError: null,
        cliente: clienteResult.data,
        itens: itensResult.data,
        itensError: itensResult.error,
        servicos: servicosResult.data,
        servicosError: servicosResult.error,
        extrasRaw: extrasResult.data,
        extrasError: extrasResult.error,
      };
    },
  });

  if (comandaError || !comanda) {
    return (
      <ProfissionalShell title="Comanda" subtitle="Detalhes">
        <div className="rounded-[1.25rem] border border-zinc-200 bg-white p-4 text-sm text-zinc-500 shadow-sm">
          Comanda não encontrada.
        </div>
      </ProfissionalShell>
    );
  }

  if (acessoError || !acessoCount) {
    return (
      <ProfissionalShell title="Comanda" subtitle="Detalhes">
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          Você não tem acesso a esta comanda.
        </div>
      </ProfissionalShell>
    );
  }

  if (itensError) {
    throw new Error(itensError.message);
  }

  const permiteEdicao = String(comanda.status).toLowerCase() === "aberta";
  const servicoIdempotencyKey = randomUUID();
  const extraIdempotencyKey = randomUUID();

  if (servicosError) {
    throw new Error(servicosError.message);
  }

  if (extrasError) {
    throw new Error(extrasError.message || "Erro ao carregar itens extras.");
  }

  const extras = ((extrasRaw ?? []) as ExtraOption[]).filter(
    (item) => item.ativo === true
  );

  return (
    <ProfissionalShell
      title={`Comanda #${comanda.numero}`}
      subtitle={cliente?.nome || comanda.status}
    >
      <div className="space-y-4 pb-24">
        {query?.ok ? (
          <div className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
            {query.ok}
          </div>
        ) : null}

        {query?.erro ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {query.erro}
          </div>
        ) : null}

        {!permiteEdicao ? (
          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
            Esta comanda está <strong>{comanda.status}</strong>. Não é possível
            adicionar itens, excluir itens ou enviar para o caixa.
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-zinc-500">Cliente</div>
              <div className="mt-1 text-lg font-semibold text-zinc-950">
                {cliente?.nome || "Cliente"}
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                {cliente?.telefone || "Sem telefone"}
              </div>
            </div>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                comanda.status
              )}`}
            >
              {comanda.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                Subtotal
              </div>
              <div className="mt-2 text-sm font-semibold text-zinc-950">
                {formatarMoeda(Number(comanda.subtotal || 0))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                Desconto
              </div>
              <div className="mt-2 text-sm font-semibold text-zinc-950">
                {formatarMoeda(Number(comanda.desconto || 0))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                Total
              </div>
              <div className="mt-2 text-sm font-semibold text-zinc-950">
                {formatarMoeda(Number(comanda.total || 0))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Itens da comanda
          </div>

          {itens?.length ? (
            <div className="space-y-3">
              {((itens ?? []) as ComandaItemRow[]).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">
                        {item.descricao || "Item"}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        {traduzirTipoItem(item.tipo_item)} · Qtd.{" "}
                        {Number(item.quantidade || 0)}
                      </div>

                      <div className="mt-1 text-sm text-zinc-500">
                        Unitário: {formatarMoeda(Number(item.valor_unitario || 0))}
                      </div>

                      <div className="mt-1 text-sm font-medium text-zinc-900">
                        Total: {formatarMoeda(Number(item.valor_total || 0))}
                      </div>
                    </div>

                    {permiteEdicao ? (
                      <form action={excluirItemDaComandaAction}>
                        <input type="hidden" name="id_comanda" value={comanda.id} />
                        <input type="hidden" name="id_item" value={item.id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                        >
                          Excluir
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-400">
                        Bloqueado
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-500">Nenhum item na comanda.</div>
          )}
        </div>

        {permiteEdicao ? (
          <>
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Adicionar serviço
              </div>

              <form action={adicionarServicoNaComandaAction} className="space-y-3">
                <input type="hidden" name="id_comanda" value={comanda.id} />
                <input
                  type="hidden"
                  name="idempotency_key"
                  value={servicoIdempotencyKey}
                />

                <select
                  name="id_servico"
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
                  defaultValue=""
                >
                  <option value="">Selecione um serviço</option>
                  {((servicos ?? []) as ServicoOption[]).map((servico) => {
                    const valor = Number(
                      servico.preco ?? servico.preco_padrao ?? 0
                    );

                    return (
                      <option key={servico.id} value={servico.id}>
                        {servico.nome} · {formatarMoeda(valor)}
                      </option>
                    );
                  })}
                </select>

                <input
                  type="number"
                  name="quantidade"
                  min={1}
                  step={1}
                  defaultValue={1}
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
                />

                <button
                  type="submit"
              className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white"
                >
                  + Adicionar serviço
                </button>
              </form>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Adicionar item extra
              </div>

              {(extras ?? []).length ? (
                <form action={adicionarExtraNaComandaAction} className="space-y-3">
                  <input type="hidden" name="id_comanda" value={comanda.id} />
                  <input
                    type="hidden"
                    name="idempotency_key"
                    value={extraIdempotencyKey}
                  />

                  <select
                    name="id_item_extra"
                    className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
                    defaultValue=""
                  >
                    <option value="">Selecione um item extra</option>
                    {(extras ?? []).map((extra) => (
                      <option key={extra.id} value={extra.id}>
                        {extra.nome} · {formatarMoeda(Number(extra.preco_venda || 0))}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    name="quantidade"
                    min={1}
                    step={1}
                    defaultValue={1}
                    className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
                  />

                  <button
                    type="submit"
                    className="h-12 w-full rounded-2xl border border-[#d8b36b] bg-white text-sm font-semibold text-[#b07b19]"
                  >
                    + Adicionar item extra
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                  Nenhum item extra ativo encontrado.
                </div>
              )}
            </div>

            <form action={enviarComandaParaCaixaAction}>
              <input type="hidden" name="id_comanda" value={comanda.id} />
              <button
                type="submit"
                disabled={!itens?.length}
            className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar para o caixa
              </button>
            </form>
          </>
        ) : (
          <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 text-sm text-zinc-500 shadow-sm">
            Ações bloqueadas porque a comanda não está aberta.
          </div>
        )}
      </div>
    </ProfissionalShell>
  );
}
