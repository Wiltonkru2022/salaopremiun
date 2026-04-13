import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

type BodyInput = {
  idSalao: string;
};

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await req.json()) as BodyInput;

    const idSalao = String(body.idSalao || "").trim();

    if (!idSalao) {
      return NextResponse.json(
        { error: "idSalao é obrigatório." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("assinaturas_cobrancas")
      .select(`
        id,
        referencia,
        valor,
        status,
        forma_pagamento,
        data_expiracao,
        payment_date,
        confirmed_date,
        invoice_url,
        bank_slip_url,
        created_at
      `)
      .eq("id_salao", idSalao)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao buscar histórico." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      historico: data || [],
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao buscar histórico.",
      },
      { status: 500 }
    );
  }
}