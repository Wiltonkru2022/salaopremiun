import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AuthzError, requireAdminSalao } from "@/lib/auth/require-admin-salao";

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

type BodyPayload = {
  idUsuario?: string;
  idSalao?: string;
};

export async function DELETE(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await req.json()) as BodyPayload;

    const idUsuario = String(body?.idUsuario || "").trim();
    const idSalao = String(body?.idSalao || "").trim();

    if (!idUsuario) {
      return NextResponse.json(
        { error: "idUsuario é obrigatório." },
        { status: 400 }
      );
    }

    if (!idSalao) {
      return NextResponse.json(
        { error: "idSalao é obrigatório." },
        { status: 400 }
      );
    }

    await requireAdminSalao(idSalao);

    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .select("id, id_salao, nome, email, nivel, auth_user_id, status")
      .eq("id", idUsuario)
      .eq("id_salao", idSalao)
      .maybeSingle();

    if (usuarioError) {
      console.error("Erro ao buscar usuário:", usuarioError);
      return NextResponse.json(
        { error: "Erro ao localizar usuário." },
        { status: 500 }
      );
    }

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const nivelUsuario = String(usuario.nivel || "").toLowerCase();

    if (nivelUsuario === "admin") {
      const { count: adminsCount, error: adminsCountError } =
        await supabaseAdmin
          .from("usuarios")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .eq("status", "ativo")
          .eq("nivel", "admin");

      if (adminsCountError) {
        console.error("Erro ao contar admins:", adminsCountError);
        return NextResponse.json(
          { error: "Erro ao validar admins do salão." },
          { status: 500 }
        );
      }

      if (Number(adminsCount || 0) <= 1) {
        return NextResponse.json(
          {
            error: "Não é permitido excluir o último admin ativo do salão.",
          },
          { status: 409 }
        );
      }
    }

    const { error: deletePermissoesError } = await supabaseAdmin
      .from("usuarios_permissoes")
      .delete()
      .eq("id_usuario", idUsuario)
      .eq("id_salao", idSalao);

    if (deletePermissoesError) {
      console.error(
        "Erro ao excluir usuarios_permissoes:",
        deletePermissoesError
      );
      return NextResponse.json(
        { error: "Erro ao excluir permissões do usuário." },
        { status: 500 }
      );
    }

    const { error: deleteUsuarioError } = await supabaseAdmin
      .from("usuarios")
      .delete()
      .eq("id", idUsuario)
      .eq("id_salao", idSalao);

    if (deleteUsuarioError) {
      console.error("Erro ao excluir usuário:", deleteUsuarioError);
      return NextResponse.json(
        { error: "Erro ao excluir usuário." },
        { status: 500 }
      );
    }

    let authRemovido = false;
    let authAviso: string | null = null;

    if (usuario.auth_user_id) {
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(usuario.auth_user_id);

      if (authDeleteError) {
        console.error("Erro ao excluir usuário do Auth:", authDeleteError);
        authAviso =
          "Usuário removido das tabelas, mas não foi possível excluir do Supabase Auth.";
      } else {
        authRemovido = true;
      }
    } else {
      authAviso =
        "Usuário removido das tabelas. Não havia auth_user_id para excluir no Supabase Auth.";
    }

    return NextResponse.json({
      ok: true,
      message: "Usuário excluído com sucesso.",
      auth_removido: authRemovido,
      auth_aviso: authAviso,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro geral ao excluir usuário:", error);

    return NextResponse.json(
      { error: "Erro interno ao excluir usuário." },
      { status: 500 }
    );
  }
}

