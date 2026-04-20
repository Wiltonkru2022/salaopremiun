import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registrarLogSistema } from "@/lib/system-logs";

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
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

type CadastroSalaoBody = {
  email: string;
  senha: string;
  nomeSalao: string;
  responsavel: string;
  whatsapp?: string;
  cpfCnpj: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  numero?: string;
  complemento?: string;
  plano?: string;
  origem?: string;
};

type CadastroSalaoRpcResult = {
  id_salao?: string | null;
};

function normalizePlano(value: unknown) {
  const plano = String(value || "").trim().toLowerCase();
  return plano === "basico" || plano === "pro" || plano === "premium"
    ? plano
    : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CadastroSalaoBody;

    const {
      email,
      senha,
      nomeSalao,
      responsavel,
      whatsapp,
      cpfCnpj,
      cep,
      endereco,
      bairro,
      cidade,
      estado,
      numero,
      complemento,
    } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });
    }

    if (!senha?.trim()) {
      return NextResponse.json({ error: "Informe a senha." }, { status: 400 });
    }

    if (senha.trim().length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (!nomeSalao?.trim()) {
      return NextResponse.json(
        { error: "Informe o nome do salão." },
        { status: 400 }
      );
    }

    if (!responsavel?.trim()) {
      return NextResponse.json(
        { error: "Informe o responsável." },
        { status: 400 }
      );
    }

    if (!cpfCnpj?.trim()) {
      return NextResponse.json(
        { error: "Informe CPF/CNPJ." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const emailNormalizado = email.trim().toLowerCase();
    const nomeSalaoNormalizado = nomeSalao.trim();
    const responsavelNormalizado = responsavel.trim();
    const whatsappNormalizado = whatsapp?.trim() || null;
    const cpfCnpjLimpo = onlyNumbers(cpfCnpj);
    const cepLimpo = onlyNumbers(cep || "") || null;
    const enderecoNormalizado = endereco?.trim() || null;
    const bairroNormalizado = bairro?.trim() || null;
    const cidadeNormalizada = cidade?.trim() || null;
    const estadoNormalizado = estado?.trim().toUpperCase() || null;
    const numeroNormalizado = numero?.trim() || null;
    const complementoNormalizado = complemento?.trim() || null;
    const planoNormalizado = normalizePlano(body.plano);
    const origemNormalizada =
      String(body.origem || "").trim().slice(0, 80) || "cadastro_salao";

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: emailNormalizado,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome: responsavelNormalizado,
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Erro ao criar usuário." },
        { status: 400 }
      );
    }

    const user = authData.user;

    const { data: cadastroData, error: cadastroError } =
      await supabaseAdmin.rpc("fn_cadastrar_salao_transacional", {
        p_auth_user_id: user.id,
        p_email: emailNormalizado,
        p_nome_salao: nomeSalaoNormalizado,
        p_responsavel: responsavelNormalizado,
        p_whatsapp: whatsappNormalizado,
        p_cpf_cnpj: cpfCnpjLimpo,
        p_cep: cepLimpo,
        p_endereco: enderecoNormalizado,
        p_numero: numeroNormalizado,
        p_complemento: complementoNormalizado,
        p_bairro: bairroNormalizado,
        p_cidade: cidadeNormalizada,
        p_estado: estadoNormalizado,
        p_plano_interesse: planoNormalizado,
        p_origem: origemNormalizada,
      });

    const cadastro = (Array.isArray(cadastroData)
      ? cadastroData[0]
      : cadastroData) as CadastroSalaoRpcResult | string | null;
    const idSalao =
      typeof cadastro === "string" ? cadastro : cadastro?.id_salao || null;

    if (cadastroError || !idSalao) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);

      return NextResponse.json(
        {
          error:
            cadastroError?.message ||
            "Erro ao criar salão em transação. Verifique a migration fn_cadastrar_salao_transacional.",
        },
        { status: 400 }
      );
    }

    await registrarLogSistema({
      gravidade: "info",
      modulo: "cadastro_salao",
      idSalao,
      mensagem: "Salão cadastrado pendente de ativação comercial.",
      detalhes: {
        origem: origemNormalizada,
        plano_interesse: planoNormalizado,
        status_inicial: "pendente",
        email: emailNormalizado,
      },
    });

    return NextResponse.json({
      ok: true,
      id_salao: idSalao,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno no cadastro.",
      },
      { status: 500 }
    );
  }
}
