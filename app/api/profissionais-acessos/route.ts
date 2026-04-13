import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "../../../lib/profissional-auth.server";

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

    const idProfissional = body.id_profissional?.trim();
    const cpf = onlyDigits(body.cpf);
    const senha = body.senha?.trim() || "";
    const ativo = !!body.ativo;

    if (!idProfissional) {
      return NextResponse.json(
        { error: "ID do profissional é obrigatório." },
        { status: 400 }
      );
    }

    if (!cpf) {
      return NextResponse.json(
        { error: "CPF é obrigatório." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: acessoExistente, error: acessoExistenteError } = await supabase
      .from("profissionais_acessos")
      .select("id, senha_hash")
      .eq("id_profissional", idProfissional)
      .maybeSingle();

    if (acessoExistenteError) {
      return NextResponse.json(
        { error: acessoExistenteError.message },
        { status: 400 }
      );
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
      const { error } = await supabase
        .from("profissionais_acessos")
        .update(payload)
        .eq("id", acessoExistente.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      const { error } = await supabase
        .from("profissionais_acessos")
        .insert(payload);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("ERRO API PROFISSIONAIS ACESSOS:", e);
    return NextResponse.json(
      { error: e.message || "Erro interno ao salvar acesso." },
      { status: 500 }
    );
  }
}