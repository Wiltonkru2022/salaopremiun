import { NextRequest, NextResponse } from "next/server";
import { requireSalaoPermission } from "@/lib/auth/require-salao-permission";
import { getErrorMessage } from "@/lib/get-error-message";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { registrarLogSistema } from "@/lib/system-logs";

function parseMoney(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  }

  const normalized = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function isMissingRpcFunction(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("fn_cliente_registrar_credito_manual") ||
    message.includes("Could not find the function") ||
    message.includes("function public.fn_cliente_registrar_credito_manual")
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      idSalao?: string;
      clienteId?: string;
      valor?: unknown;
      observacao?: string;
    };

    const idSalao = String(body.idSalao || "").trim();
    const clienteId = String(body.clienteId || "").trim();
    const valor = parseMoney(body.valor);
    const observacao = String(body.observacao || "").trim().slice(0, 500);

    if (!idSalao || !clienteId) {
      return NextResponse.json(
        { error: "Informe o salao e a cliente para registrar o credito." },
        { status: 400 }
      );
    }

    if (valor <= 0) {
      return NextResponse.json(
        { error: "Informe um valor de credito maior que zero." },
        { status: 400 }
      );
    }

    const membership = await requireSalaoPermission(idSalao, "caixa_pagamentos");
    const supabaseAdmin = getSupabaseAdmin() as any;

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      "fn_cliente_registrar_credito_manual",
      {
        p_id_salao: idSalao,
        p_id_cliente: clienteId,
        p_id_usuario: membership.usuario.id,
        p_valor: valor,
        p_observacao: observacao || null,
        p_origem: "agenda",
      }
    );

    if (!rpcError) {
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      return NextResponse.json({
        ok: true,
        saldoAnterior: Number(row?.saldo_anterior || 0),
        saldoAtual: Number(row?.saldo_atual || 0),
      });
    }

    if (!isMissingRpcFunction(rpcError)) {
      throw rpcError;
    }

    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from("clientes")
      .select("id, cashback")
      .eq("id_salao", idSalao)
      .eq("id", clienteId)
      .maybeSingle();

    if (clienteError) throw clienteError;
    if (!cliente?.id) {
      return NextResponse.json(
        { error: "Cliente nao encontrada neste salao." },
        { status: 404 }
      );
    }

    const saldoAnterior = Number(cliente.cashback || 0);
    const saldoAtual = Math.round((saldoAnterior + valor) * 100) / 100;
    const { error: updateError } = await supabaseAdmin
      .from("clientes")
      .update({
        cashback: saldoAtual,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id_salao", idSalao)
      .eq("id", clienteId);

    if (updateError) throw updateError;

    await registrarLogSistema({
      gravidade: "info",
      modulo: "clientes",
      idSalao,
      idUsuario: membership.usuario.id,
      mensagem: "Credito manual da cliente registrado pela agenda.",
      detalhes: {
        acao: "registrar_credito_cliente",
        origem: "agenda",
        id_cliente: clienteId,
        valor,
        saldo_anterior: saldoAnterior,
        saldo_atual: saldoAtual,
        observacao,
        fallback_sem_rpc: true,
      },
    });

    return NextResponse.json({
      ok: true,
      saldoAnterior,
      saldoAtual,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(error, "Nao foi possivel registrar o credito da cliente."),
      },
      { status: 500 }
    );
  }
}
