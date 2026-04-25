import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Receipt } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalStatusPill from "@/components/profissional/ui/ProfissionalStatusPill";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
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

function getStatusMeta(status: string) {
  const s = String(status || "").toLowerCase();

  if (s === "aberta") return { label: "Aberta", tone: "info" as const };
  if (s === "aguardando_pagamento") {
    return { label: "Aguardando pagamento", tone: "warning" as const };
  }
  if (s === "fechada") return { label: "Fechada", tone: "success" as const };
  if (s === "cancelada") return { label: "Cancelada", tone: "danger" as const };

  return { label: status || "Status", tone: "neutral" as const };
}

function traduzirTipoItem(tipo: string | null | undefined) {
  const valor = String(tipo || "").toLowerCase();
  if (valor === "servico") return "Servico";
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

      const [clienteResult, itensResult, servicosResult, extrasResult] =
        await Promise.all([
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
          Comanda nao encontrada.
        </div>
      </ProfissionalShell>
    );
  }

  if (acessoError || !acessoCount) {
    return (
      <ProfissionalShell title="Comanda" subtitle="Detalhes">
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          Voce nao tem acesso a esta comanda.
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
  const status = getStatusMeta(String(comanda.status || ""));

  return (
    <ProfissionalShell
      title={`Comanda #${comanda.numero}`}
      subtitle={cliente?.nome || String(comanda.status || "")}
    >
      <div className="space-y-4 pb-24">
        <Link
          href="/app-profissional/comandas"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700"
        >
          <ArrowLeft size={18} />
          Voltar para comandas
        </Link>

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

        <section className="overflow-hidden rounded-[1.85rem] bg-zinc-950 px-4 py-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                Cliente
              </div>
              <h1 className="mt-2 text-[1.7rem] font-black tracking-[-0.05em] leading-none">
                {cliente?.nome || "Cliente"}
              </h1>
              <div className="mt-2 text-sm text-zinc-300">
                {cliente?.telefone || "Sem telefone"}
              </div>
            </div>

            <ProfissionalStatusPill label={status.label} tone={status.tone} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-[1.25rem] bg-white/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-300">
                Subtotal
              </div>
              <div className="mt-2 text-base font-bold">
                {formatarMoeda(Number(comanda.subtotal || 0))}
              </div>
            </div>

            <div className="rounded-[1.25rem] bg-white/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-300">
                Desconto
              </div>
              <div className="mt-2 text-base font-bold">
                {formatarMoeda(Number(comanda.desconto || 0))}
              </div>
            </div>

            <div className="rounded-[1.25rem] bg-white/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-300">
                Total
              </div>
              <div className="mt-2 text-base font-bold">
                {formatarMoeda(Number(comanda.total || 0))}
              </div>
            </div>
          </div>
        </section>

        {!permiteEdicao ? (
          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
            Esta comanda esta {String(comanda.status || "").toLowerCase()}. Nao e
            possivel adicionar itens nem enviar ao caixa.
          </div>
        ) : null}

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Itens da comanda"
            description="Revise o que ja foi lancado antes de enviar ao caixa."
          />

          {itens?.length ? (
            <div className="space-y-3">
              {((itens ?? []) as ComandaItemRow[]).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-950">
                        {item.descricao || "Item"}
                      </div>

                      <div className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-400">
                        {traduzirTipoItem(item.tipo_item)} - Qtd.{" "}
                        {Number(item.quantidade || 0)}
                      </div>

                      <div className="mt-2 text-sm text-zinc-500">
                        Unitario: {formatarMoeda(Number(item.valor_unitario || 0))}
                      </div>

                      <div className="mt-1 text-sm font-bold text-zinc-950">
                        Total: {formatarMoeda(Number(item.valor_total || 0))}
                      </div>
                    </div>

                    {permiteEdicao ? (
                      <form action={excluirItemDaComandaAction}>
                        <input type="hidden" name="id_comanda" value={comanda.id} />
                        <input type="hidden" name="id_item" value={item.id} />
                        <button
                          type="submit"
                          className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 sm:w-auto"
                        >
                          Excluir
                        </button>
                      </form>
                    ) : (
                      <div className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-center text-xs text-zinc-400 sm:w-auto">
                        Bloqueado
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
              Nenhum item lancado nesta comanda.
            </div>
          )}
        </ProfissionalSurface>

        {permiteEdicao ? (
          <>
            <ProfissionalSurface>
              <ProfissionalSectionHeader
                title="Adicionar servico"
                description="Use para lancar servicos executados no atendimento."
                action={<PlusCircle size={18} className="text-zinc-400" />}
              />

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
                  <option value="">Selecione um servico</option>
                  {((servicos ?? []) as ServicoOption[]).map((servico) => {
                    const valor = Number(servico.preco ?? servico.preco_padrao ?? 0);

                    return (
                      <option key={servico.id} value={servico.id}>
                        {servico.nome} - {formatarMoeda(valor)}
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
                  Adicionar servico
                </button>
              </form>
            </ProfissionalSurface>

            <ProfissionalSurface>
              <ProfissionalSectionHeader
                title="Adicionar item extra"
                description="Lance adicionais usados no atendimento."
                action={<Receipt size={18} className="text-zinc-400" />}
              />

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
                        {extra.nome} - {formatarMoeda(Number(extra.preco_venda || 0))}
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
                    Adicionar item extra
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                  Nenhum item extra ativo encontrado.
                </div>
              )}
            </ProfissionalSurface>

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
        ) : null}
      </div>
    </ProfissionalShell>
  );
}
