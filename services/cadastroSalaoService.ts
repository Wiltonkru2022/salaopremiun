import { createClient } from "@supabase/supabase-js";
import { registrarLogSistema } from "@/lib/system-logs";

export type CadastroSalaoBody = {
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

type CadastroSalaoPayloadNormalizado = {
  emailNormalizado: string;
  nomeSalaoNormalizado: string;
  responsavelNormalizado: string;
  whatsappNormalizado: string | null;
  cpfCnpjLimpo: string;
  cepLimpo: string | null;
  enderecoNormalizado: string | null;
  bairroNormalizado: string | null;
  cidadeNormalizada: string | null;
  estadoNormalizado: string | null;
  numeroNormalizado: string | null;
  complementoNormalizado: string | null;
  planoNormalizado: string | null;
  origemNormalizada: string;
};

export class CadastroSalaoServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "CadastroSalaoServiceError";
  }
}

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePlano(value: unknown) {
  const plano = String(value || "").trim().toLowerCase();
  return plano === "basico" || plano === "pro" || plano === "premium"
    ? plano
    : null;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export function createCadastroSalaoService() {
  return {
    normalizePayload(body: CadastroSalaoBody): CadastroSalaoPayloadNormalizado {
      return {
        emailNormalizado: body.email.trim().toLowerCase(),
        nomeSalaoNormalizado: body.nomeSalao.trim(),
        responsavelNormalizado: body.responsavel.trim(),
        whatsappNormalizado: body.whatsapp?.trim() || null,
        cpfCnpjLimpo: onlyNumbers(body.cpfCnpj),
        cepLimpo: onlyNumbers(body.cep || "") || null,
        enderecoNormalizado: body.endereco?.trim() || null,
        bairroNormalizado: body.bairro?.trim() || null,
        cidadeNormalizada: body.cidade?.trim() || null,
        estadoNormalizado: body.estado?.trim().toUpperCase() || null,
        numeroNormalizado: body.numero?.trim() || null,
        complementoNormalizado: body.complemento?.trim() || null,
        planoNormalizado: normalizePlano(body.plano),
        origemNormalizada:
          String(body.origem || "").trim().slice(0, 80) || "cadastro_salao",
      };
    },

    async criarUsuarioAuth(params: { email: string; senha: string; nome: string }) {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: params.email,
        password: params.senha,
        email_confirm: true,
        user_metadata: {
          nome: params.nome,
        },
      });

      if (error || !data.user) {
        throw new CadastroSalaoServiceError(
          error?.message || "Erro ao criar usuario.",
          400
        );
      }

      return data.user;
    },

    async excluirUsuarioAuth(userId: string) {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.auth.admin.deleteUser(userId);
    },

    async cadastrarSalaoTransacional(params: {
      authUserId: string;
      payload: CadastroSalaoPayloadNormalizado;
    }) {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin.rpc(
        "fn_cadastrar_salao_transacional",
        {
          p_auth_user_id: params.authUserId,
          p_email: params.payload.emailNormalizado,
          p_nome_salao: params.payload.nomeSalaoNormalizado,
          p_responsavel: params.payload.responsavelNormalizado,
          p_whatsapp: params.payload.whatsappNormalizado,
          p_cpf_cnpj: params.payload.cpfCnpjLimpo,
          p_cep: params.payload.cepLimpo,
          p_endereco: params.payload.enderecoNormalizado,
          p_numero: params.payload.numeroNormalizado,
          p_complemento: params.payload.complementoNormalizado,
          p_bairro: params.payload.bairroNormalizado,
          p_cidade: params.payload.cidadeNormalizada,
          p_estado: params.payload.estadoNormalizado,
          p_plano_interesse: params.payload.planoNormalizado,
          p_origem: params.payload.origemNormalizada,
        }
      );

      const cadastro = (Array.isArray(data) ? data[0] : data) as
        | CadastroSalaoRpcResult
        | string
        | null;
      const idSalao =
        typeof cadastro === "string" ? cadastro : cadastro?.id_salao || null;

      if (error || !idSalao) {
        throw new CadastroSalaoServiceError(
          error?.message ||
            "Erro ao criar salao em transacao. Verifique a migration fn_cadastrar_salao_transacional.",
          400
        );
      }

      return idSalao;
    },

    async registrarCadastro(params: {
      idSalao: string;
      origem: string;
      plano: string | null;
      email: string;
    }) {
      await registrarLogSistema({
        gravidade: "info",
        modulo: "cadastro_salao",
        idSalao: params.idSalao,
        mensagem: "Salao cadastrado pendente de ativacao comercial.",
        detalhes: {
          origem: params.origem,
          plano_interesse: params.plano,
          status_inicial: "pendente",
          email: params.email,
        },
      });
    },
  };
}

export type CadastroSalaoService = ReturnType<typeof createCadastroSalaoService>;
