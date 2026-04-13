import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
};

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

    const { data: salaoCriado, error: salaoError } = await supabaseAdmin
      .from("saloes")
      .insert({
        nome: nomeSalaoNormalizado,
        responsavel: responsavelNormalizado,
        whatsapp: whatsappNormalizado,
        telefone: whatsappNormalizado,
        email: emailNormalizado,
        cpf_cnpj: cpfCnpjLimpo,
        cep: cepLimpo,
        endereco: enderecoNormalizado,
        numero: numeroNormalizado,
        complemento: complementoNormalizado,
        bairro: bairroNormalizado,
        cidade: cidadeNormalizada,
        estado: estadoNormalizado,

        // cadastro do salão não controla financeiro
        status: "ativo",

        // não inicia trial no cadastro
        trial_ativo: false,
        trial_inicio_em: null,
        trial_fim_em: null,

        // plano fica vazio até o usuário iniciar trial ou assinar
        plano: null,
        limite_profissionais: 0,
        limite_usuarios: 0,
      })
      .select("id")
      .single();

    if (salaoError || !salaoCriado?.id) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);

      return NextResponse.json(
        { error: salaoError?.message || "Erro ao criar salão." },
        { status: 400 }
      );
    }

    const idSalao = salaoCriado.id;

    const { error: usuarioError } = await supabaseAdmin.from("usuarios").insert({
      auth_user_id: user.id,
      email: emailNormalizado,
      nome: responsavelNormalizado,
      id_salao: idSalao,
      nivel: "admin",
      status: "ativo",
    });

    if (usuarioError) {
      await supabaseAdmin.from("saloes").delete().eq("id", idSalao);
      await supabaseAdmin.auth.admin.deleteUser(user.id);

      return NextResponse.json(
        { error: usuarioError.message || "Erro ao vincular usuário." },
        { status: 400 }
      );
    }

    const { error: configError } = await supabaseAdmin
      .from("configuracoes_salao")
      .insert({
        id_salao: idSalao,
        hora_abertura: "08:00",
        hora_fechamento: "18:00",
        intervalo_minutos: 30,
        dias_funcionamento: [
          "segunda",
          "terca",
          "quarta",
          "quinta",
          "sexta",
          "sabado",
        ],
      });

    if (configError) {
      await supabaseAdmin.from("usuarios").delete().eq("auth_user_id", user.id);
      await supabaseAdmin.from("saloes").delete().eq("id", idSalao);
      await supabaseAdmin.auth.admin.deleteUser(user.id);

      return NextResponse.json(
        { error: configError.message || "Erro ao criar configurações." },
        { status: 400 }
      );
    }

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