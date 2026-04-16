import { NextRequest, NextResponse } from "next/server";
import { requireAdminSalao } from "@/lib/auth/require-admin-salao";
import { AuthzError } from "@/lib/auth/require-salao-membership";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { hashPassword } from "@/lib/profissional-auth.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type BodyPayload = {
  id_profissional: string;
  cpf: string;
  senha?: string;
  ativo: boolean;
};

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyPayload;

    const idProfissional = String(body.id_profissional || "").trim();
    const cpf = onlyDigits(body.cpf);
    const senha = String(body.senha || "").trim();
    const ativo = Boolean(body.ativo);

    if (!idProfissional) {
      return NextResponse.json(
        { error: "ID do profissional e obrigatorio." },
        { status: 400 }
      );
    }

    if (!cpf) {
      return NextResponse.json(
        { error: "CPF e obrigatorio." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: profissional, error: profissionalError } = await supabaseAdmin
      .from("profissionais")
      .select("id, id_salao, nome")
      .eq("id", idProfissional)
      .maybeSingle();

    if (profissionalError) {
      throw profissionalError;
    }

    if (!profissional?.id || !profissional.id_salao) {
      return NextResponse.json(
        { error: "Profissional nao encontrado." },
        { status: 404 }
      );
    }

    await requireAdminSalao(profissional.id_salao);

    if (ativo) {
      await assertCanMutatePlanFeature(
        profissional.id_salao,
        "app_profissional"
      );
    }

    const { data: cpfJaUsado, error: cpfJaUsadoError } = await supabaseAdmin
      .from("profissionais_acessos")
      .select("id, id_profissional")
      .eq("cpf", cpf)
      .neq("id_profissional", idProfissional)
      .limit(1)
      .maybeSingle();

    if (cpfJaUsadoError) {
      throw cpfJaUsadoError;
    }

    if (cpfJaUsado?.id) {
      return NextResponse.json(
        { error: "Este CPF ja esta vinculado a outro acesso profissional." },
        { status: 409 }
      );
    }

    const { data: acessoExistente, error: acessoExistenteError } = await supabaseAdmin
      .from("profissionais_acessos")
      .select("id, senha_hash")
      .eq("id_profissional", idProfissional)
      .maybeSingle();

    if (acessoExistenteError) {
      throw acessoExistenteError;
    }

    let senhaHashFinal = acessoExistente?.senha_hash || null;

    if (senha) {
      senhaHashFinal = await hashPassword(senha);
    }

    if (ativo && !senhaHashFinal) {
      return NextResponse.json(
        {
          error:
            "Informe uma senha para liberar o primeiro acesso do profissional ao app.",
        },
        { status: 400 }
      );
    }

    const payload = {
      id_profissional: idProfissional,
      cpf,
      senha_hash: senhaHashFinal,
      ativo,
    };

    if (acessoExistente?.id) {
      const { error } = await supabaseAdmin
        .from("profissionais_acessos")
        .update(payload)
        .eq("id", acessoExistente.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabaseAdmin
        .from("profissionais_acessos")
        .insert(payload);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof PlanAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error("ERRO API PROFISSIONAIS ACESSOS:", error);

    return NextResponse.json(
      { error: "Erro interno ao salvar acesso do profissional." },
      { status: 500 }
    );
  }
}
