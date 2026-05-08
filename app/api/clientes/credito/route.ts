import { NextRequest, NextResponse } from "next/server";
import { requireSalaoPermission } from "@/lib/auth/require-salao-permission";
import { getErrorMessage } from "@/lib/get-error-message";
import { registrarCreditoManualCliente } from "@/services/clienteCreditoService";

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
    const result = await registrarCreditoManualCliente({
      idSalao,
      clienteId,
      idUsuario: membership.usuario.id,
      valor,
      observacao,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ClienteCreditoNotFoundError") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Nao foi possivel registrar o credito da cliente."),
      },
      { status: 500 }
    );
  }
}
