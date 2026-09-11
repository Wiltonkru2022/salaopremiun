import { registrarLogSistema } from "@/lib/system-logs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";

type CreditoRow = {
  saldo_anterior?: number | string | null;
  saldo_atual?: number | string | null;
};

function isMissingRpcFunction(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("fn_cliente_registrar_credito_manual") ||
    message.includes("Could not find the function") ||
    message.includes("function public.fn_cliente_registrar_credito_manual")
  );
}

export async function registrarCreditoManualCliente(params: {
  idSalao: string;
  clienteId: string;
  idUsuario: string;
  valor: number;
  observacao: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const supabaseRpc = asLooseSupabaseClient(supabaseAdmin);
  const { data: rpcData, error: rpcError } = await supabaseRpc.rpc<
    CreditoRow | CreditoRow[] | null
  >(
    "fn_cliente_registrar_credito_manual",
    {
      p_id_salao: params.idSalao,
      p_id_cliente: params.clienteId,
      p_id_usuario: params.idUsuario,
      p_valor: params.valor,
      p_observacao: params.observacao || null,
      p_origem: "agenda",
    }
  );

  if (!rpcError) {
    const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as CreditoRow | null;
    return {
      saldoAnterior: Number(row?.saldo_anterior || 0),
      saldoAtual: Number(row?.saldo_atual || 0),
    };
  }

  if (!isMissingRpcFunction(rpcError)) {
    throw rpcError;
  }

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id, cashback")
    .eq("id_salao", params.idSalao)
    .eq("id", params.clienteId)
    .maybeSingle();

  if (clienteError) throw clienteError;
  if (!cliente?.id) {
    const notFound = new Error("Cliente nao encontrada neste salao.");
    notFound.name = "ClienteCreditoNotFoundError";
    throw notFound;
  }

  const saldoAnterior = Number(cliente.cashback || 0);
  const saldoAtual = Math.round((saldoAnterior + params.valor) * 100) / 100;
  const { error: updateError } = await supabaseAdmin
    .from("clientes")
    .update({
      cashback: saldoAtual,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id_salao", params.idSalao)
    .eq("id", params.clienteId);

  if (updateError) throw updateError;

  await registrarLogSistema({
    gravidade: "info",
    modulo: "clientes",
    idSalao: params.idSalao,
    idUsuario: params.idUsuario,
    mensagem: "Credito manual da cliente registrado pela agenda.",
    detalhes: {
      acao: "registrar_credito_cliente",
      origem: "agenda",
      id_cliente: params.clienteId,
      valor: params.valor,
      saldo_anterior: saldoAnterior,
      saldo_atual: saldoAtual,
      observacao: params.observacao,
      fallback_sem_rpc: true,
    },
  });

  return {
    saldoAnterior,
    saldoAtual,
  };
}
