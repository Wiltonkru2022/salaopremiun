import { registrarLogSistema } from "@/lib/system-logs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const TRIAL_GRATIS_DIAS = 15;
const TRIAL_LIMITE_ILIMITADO = 999;

export type CadastroSalaoBody = {
  email: string;
  senha: string;
  nomeSalao: string;
  responsavel: string;
  whatsapp?: string;
  cpfCnpj?: string;
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

export function createCadastroSalaoService() {
  return {
    normalizePayload(body: CadastroSalaoBody): CadastroSalaoPayloadNormalizado {
      return {
        emailNormalizado: body.email.trim().toLowerCase(),
        nomeSalaoNormalizado: body.nomeSalao.trim(),
        responsavelNormalizado: body.responsavel.trim(),
        whatsappNormalizado: body.whatsapp?.trim() || null,
        cpfCnpjLimpo: onlyNumbers(body.cpfCnpj || ""),
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
          p_whatsapp: params.payload.whatsappNormalizado || undefined,
          p_cpf_cnpj: params.payload.cpfCnpjLimpo || undefined,
          p_cep: params.payload.cepLimpo || undefined,
          p_endereco: params.payload.enderecoNormalizado || undefined,
          p_numero: params.payload.numeroNormalizado || undefined,
          p_complemento: params.payload.complementoNormalizado || undefined,
          p_bairro: params.payload.bairroNormalizado || undefined,
          p_cidade: params.payload.cidadeNormalizada || undefined,
          p_estado: params.payload.estadoNormalizado || undefined,
          p_plano_interesse: params.payload.planoNormalizado || undefined,
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

    async ativarTrialInicial(idSalao: string) {
      const supabaseAdmin = getSupabaseAdmin();
      const agora = new Date();
      const trialFim = new Date(agora);
      trialFim.setDate(trialFim.getDate() + TRIAL_GRATIS_DIAS);

      const agoraIso = agora.toISOString();
      const trialFimIso = trialFim.toISOString();
      const vencimentoEm = trialFimIso.slice(0, 10);

      const { error: assinaturaError } = await supabaseAdmin
        .from("assinaturas")
        .insert({
          id_salao: idSalao,
          plano: "teste_gratis",
          valor: 0,
          status: "teste_gratis",
          vencimento_em: vencimentoEm,
          limite_profissionais: TRIAL_LIMITE_ILIMITADO,
          limite_usuarios: TRIAL_LIMITE_ILIMITADO,
          pago_em: null,
          trial_ativo: "true",
          trial_inicio_em: agoraIso,
          trial_fim_em: trialFimIso,
          gateway: null,
          forma_pagamento_atual: null,
          id_cobranca_atual: null,
          referencia_atual: null,
          asaas_payment_id: null,
          renovacao_automatica: false,
        });

      if (assinaturaError) {
        throw new CadastroSalaoServiceError(
          assinaturaError.message || "Erro ao ativar teste gratis inicial.",
          500
        );
      }

      const { error: salaoError } = await supabaseAdmin
        .from("saloes")
        .update({
          status: "teste_gratis",
          plano: "teste_gratis",
          trial_ativo: true,
          trial_inicio_em: agoraIso,
          trial_fim_em: trialFimIso,
          limite_profissionais: TRIAL_LIMITE_ILIMITADO,
          limite_usuarios: TRIAL_LIMITE_ILIMITADO,
        })
        .eq("id", idSalao);

      if (salaoError) {
        throw new CadastroSalaoServiceError(
          salaoError.message || "Erro ao atualizar teste gratis do salao.",
          500
        );
      }

      return {
        status: "teste_gratis",
        plano: "teste_gratis",
        trial_inicio_em: agoraIso,
        trial_fim_em: trialFimIso,
        vencimento_em: vencimentoEm,
        dias: TRIAL_GRATIS_DIAS,
      };
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
        mensagem: "Salao cadastrado com teste gratis ativo.",
        detalhes: {
          origem: params.origem,
          plano_interesse: params.plano,
          status_inicial: "teste_gratis",
          trial_dias: TRIAL_GRATIS_DIAS,
          email: params.email,
        },
      });
    },
  };
}

export type CadastroSalaoService = ReturnType<typeof createCadastroSalaoService>;
