import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildSalonPasswordReuseHash } from "@/lib/auth/password-reuse";

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

type Body = {
  idSalao: string;
  nome: string;
  email: string;
  senha: string;
  nivel: "admin" | "gerente" | "recepcao" | "profissional";
  status: "ativo" | "inativo";
};

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await req.json()) as Body;

    const idSalao = String(body.idSalao || "").trim();
    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "");
    const nivel = String(body.nivel || "").trim().toLowerCase();
    const status = String(body.status || "ativo").trim().toLowerCase();

    if (!idSalao) {
      return NextResponse.json(
        { error: "Salão não informado." },
        { status: 400 }
      );
    }

    if (!nome) {
      return NextResponse.json(
        { error: "Nome é obrigatório." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "E-mail é obrigatório." },
        { status: 400 }
      );
    }

    if (!senha || senha.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (!["admin", "gerente", "recepcao", "profissional"].includes(nivel)) {
      return NextResponse.json(
        { error: "Nível inválido." },
        { status: 400 }
      );
    }

    if (!["ativo", "inativo"].includes(status)) {
      return NextResponse.json(
        { error: "Status inválido." },
        { status: 400 }
      );
    }

    const senhaHashReuso = buildSalonPasswordReuseHash({
      idSalao,
      password: senha,
    });

    const { data: reusedPassword, error: reusedPasswordError } =
      await supabaseAdmin
        .from("usuarios_senhas_reuso")
        .select("id")
        .eq("id_salao", idSalao)
        .eq("senha_hash_reuso", senhaHashReuso)
        .limit(1)
        .maybeSingle();

    if (reusedPasswordError) {
      return NextResponse.json(
        { error: "Erro ao validar reuso de senha." },
        { status: 500 }
      );
    }

    if (reusedPassword?.id) {
      return NextResponse.json(
        {
          error:
            "Esta senha já está sendo usada por outro usuário deste salão. Escolha uma senha diferente.",
        },
        { status: 409 }
      );
    }

    const { data: existingUser, error: existingUserError } =
      await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("id_salao", idSalao)
        .eq("email", email)
        .limit(1)
        .maybeSingle();

    if (existingUserError) {
      return NextResponse.json(
        { error: "Erro ao validar e-mail." },
        { status: 500 }
      );
    }

    if (existingUser?.id) {
      return NextResponse.json(
        { error: "Já existe um usuário com esse e-mail neste salão." },
        { status: 409 }
      );
    }

    const { data: authCreated, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome,
          id_salao: idSalao,
          nivel,
        },
      });

    if (authError || !authCreated.user) {
      return NextResponse.json(
        { error: authError?.message || "Erro ao criar usuário no Auth." },
        { status: 400 }
      );
    }

    const authUserId = authCreated.user.id;

    const { data: usuarioInserido, error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .insert({
        id_salao: idSalao,
        nome,
        email,
        nivel,
        status,
        auth_user_id: authUserId,
      })
      .select("id, id_salao, nome, email, nivel, status, auth_user_id")
      .single();

    if (usuarioError || !usuarioInserido) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return NextResponse.json(
        { error: usuarioError?.message || "Erro ao gravar usuário." },
        { status: 400 }
      );
    }

    const { error: reusoError } = await supabaseAdmin
      .from("usuarios_senhas_reuso")
      .insert({
        id_salao: idSalao,
        id_usuario: usuarioInserido.id,
        auth_user_id: authUserId,
        email,
        senha_hash_reuso: senhaHashReuso,
      });

    if (reusoError) {
      await supabaseAdmin
        .from("usuarios")
        .delete()
        .eq("id", usuarioInserido.id);

      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return NextResponse.json(
        { error: "Erro ao registrar política de senha." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      usuario: usuarioInserido,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);

    return NextResponse.json(
      { error: "Erro interno ao criar usuário." },
      { status: 500 }
    );
  }
}