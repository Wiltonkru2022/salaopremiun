import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildSalonPasswordReuseHash } from "@/lib/auth/password-reuse";
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

type Body = {
  idUsuario: string;
  idSalao: string;
  nome: string;
  email: string;
  nivel: "admin" | "gerente" | "recepcao" | "profissional";
  status: "ativo" | "inativo";
  senha?: string;
};

export async function PATCH(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await req.json()) as Body;

    const idUsuario = String(body.idUsuario || "").trim();
    const idSalao = String(body.idSalao || "").trim();
    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const nivel = String(body.nivel || "").trim().toLowerCase();
    const status = String(body.status || "ativo").trim().toLowerCase();
    const senha = String(body.senha || "").trim();

    if (!idUsuario || !idSalao) {
      return NextResponse.json(
        { error: "Usuário inválido." },
        { status: 400 }
      );
    }

    await requireAdminSalao(idSalao);

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

    if (!["admin", "gerente", "recepcao", "profissional"].includes(nivel)) {
      return NextResponse.json(
        { error: "Nível de usuário inválido." },
        { status: 400 }
      );
    }

    if (!["ativo", "inativo"].includes(status)) {
      return NextResponse.json(
        { error: "Status inválido." },
        { status: 400 }
      );
    }

    const { data: usuarioAtual, error: usuarioAtualError } = await supabaseAdmin
      .from("usuarios")
      .select("id, auth_user_id, email, nivel, status")
      .eq("id", idUsuario)
      .eq("id_salao", idSalao)
      .single();

    if (usuarioAtualError || !usuarioAtual) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const { data: emailDuplicado, error: emailDuplicadoError } =
      await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("id_salao", idSalao)
        .eq("email", email)
        .neq("id", idUsuario)
        .limit(1)
        .maybeSingle();

    if (emailDuplicadoError) {
      console.error("Erro ao validar e-mail duplicado:", emailDuplicadoError);
      return NextResponse.json(
        { error: "Erro ao validar e-mail." },
        { status: 500 }
      );
    }

    if (emailDuplicado?.id) {
      return NextResponse.json(
        { error: "Já existe outro usuário com esse e-mail neste salão." },
        { status: 409 }
      );
    }

    if (senha) {
      if (senha.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve ter pelo menos 6 caracteres." },
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
          .neq("id_usuario", idUsuario)
          .limit(1)
          .maybeSingle();

      if (reusedPasswordError) {
        console.error("Erro ao validar reuso de senha:", reusedPasswordError);
        return NextResponse.json(
          {
            error:
              reusedPasswordError.message || "Erro ao validar reuso de senha.",
          },
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

      if (usuarioAtual.auth_user_id) {
        const { error: authUpdateError } =
          await supabaseAdmin.auth.admin.updateUserById(
            usuarioAtual.auth_user_id,
            {
              email,
              password: senha,
              user_metadata: {
                nome,
                id_salao: idSalao,
                nivel,
                status,
              },
            }
          );

        if (authUpdateError) {
          console.error("Erro ao atualizar usuário no Auth:", authUpdateError);
          return NextResponse.json(
            { error: authUpdateError.message || "Erro ao atualizar Auth." },
            { status: 400 }
          );
        }
      }

      const payloadReuso: Record<string, unknown> = {
        id_salao: idSalao,
        id_usuario: idUsuario,
        email,
        senha_hash_reuso: senhaHashReuso,
      };

      if (usuarioAtual.auth_user_id) {
        payloadReuso.auth_user_id = usuarioAtual.auth_user_id;
      }

      const { error: reusoUpsertError } = await supabaseAdmin
        .from("usuarios_senhas_reuso")
        .upsert(payloadReuso, { onConflict: "id_usuario" });

      if (reusoUpsertError) {
        console.error(
          "Erro real ao atualizar política de senha:",
          reusoUpsertError
        );

        return NextResponse.json(
          {
            error:
              reusoUpsertError.message ||
              "Erro ao atualizar política de senha.",
          },
          { status: 400 }
        );
      }
    } else if (usuarioAtual.auth_user_id) {
      const { error: authUpdateError } =
        await supabaseAdmin.auth.admin.updateUserById(
          usuarioAtual.auth_user_id,
          {
            email,
            user_metadata: {
              nome,
              id_salao: idSalao,
              nivel,
              status,
            },
          }
        );

      if (authUpdateError) {
        console.error(
          "Erro ao atualizar Auth sem troca de senha:",
          authUpdateError
        );
        return NextResponse.json(
          { error: authUpdateError.message || "Erro ao atualizar Auth." },
          { status: 400 }
        );
      }
    }

    const { error: usuarioUpdateError } = await supabaseAdmin
      .from("usuarios")
      .update({
        nome,
        email,
        nivel,
        status,
      })
      .eq("id", idUsuario)
      .eq("id_salao", idSalao);

    if (usuarioUpdateError) {
      console.error("Erro ao atualizar tabela usuarios:", usuarioUpdateError);
      return NextResponse.json(
        { error: usuarioUpdateError.message || "Erro ao atualizar usuário." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro interno ao atualizar usuário:", error);

    return NextResponse.json(
      { error: "Erro interno ao atualizar usuário." },
      { status: 500 }
    );
  }
}

