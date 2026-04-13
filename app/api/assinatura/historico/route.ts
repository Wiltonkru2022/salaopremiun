import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

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

async function getSupabaseServer() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
}

async function validarSalaoDoUsuario(idSalao: string) {
  const supabase = await getSupabaseServer();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new HttpError("Erro ao validar usuário autenticado.", 401);
  }

  if (!user) {
    throw new HttpError("Usuário não autenticado.", 401);
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id_salao, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    throw new HttpError("Erro ao validar vínculo do usuário com o salão.", 500);
  }

  if (!usuario?.id_salao) {
    throw new HttpError("Usuário sem salão vinculado.", 403);
  }

  if (String(usuario.status || "").toLowerCase() !== "ativo") {
    throw new HttpError("Usuário inativo.", 403);
  }

  if (usuario.id_salao !== idSalao) {
    throw new HttpError("Acesso negado para este salão.", 403);
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();

    const idSalao = String(body?.idSalao || "").trim();

    if (!idSalao) {
      return NextResponse.json(
        { error: "idSalao é obrigatório." },
        { status: 400 }
      );
    }

    await validarSalaoDoUsuario(idSalao);

    const { data, error } = await supabaseAdmin
      .from("assinaturas_cobrancas")
      .select(`
        id,
        referencia,
        descricao,
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
        { error: error.message || "Erro ao carregar histórico." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      historico: data || [],
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao carregar histórico.",
      },
      { status: 500 }
    );
  }
}