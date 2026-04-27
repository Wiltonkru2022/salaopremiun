import { randomUUID } from "node:crypto";
import { addDays, format } from "date-fns";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import {
  buscarQrCodePix,
  criarCobranca,
  criarOuBuscarCliente,
} from "@/lib/payments/pix-provider";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type BillingType = "PIX" | "BOLETO";

type PacoteRow = {
  id: string;
  nome: string;
  quantidade_creditos: number | null;
  preco: number | string | null;
  ativo: boolean | null;
};

type SalaoRow = {
  id: string;
  nome?: string | null;
  responsavel?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  cpf_cnpj?: string | null;
};

type UsuarioRow = {
  id_salao: string;
  status?: string | null;
  nivel?: string | null;
};

type CompraExistenteRow = {
  id: string;
  status?: string | null;
  billing_type?: string | null;
  valor?: number | string | null;
  quantidade_creditos?: number | null;
  asaas_payment_id?: string | null;
  invoice_url?: string | null;
  bank_slip_url?: string | null;
  pix_copia_cola?: string | null;
  qr_code_base64?: string | null;
};

export class WhatsappPacoteCheckoutServiceError extends Error {
  constructor(
    message: string,
    public status = 500
  ) {
    super(message);
    this.name = "WhatsappPacoteCheckoutServiceError";
  }
}

async function getSupabaseServer() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new WhatsappPacoteCheckoutServiceError(
      "Configuracao do Supabase incompleta.",
      500
    );
  }

  const cookieOptions = getSupabaseCookieOptions(headersList.get("host"));

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
}

function onlyNumbers(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function toMoney(value?: number | string | null) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

async function validarSalaoAdmin() {
  const supabase = await getSupabaseServer();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new WhatsappPacoteCheckoutServiceError(
      "Erro ao validar usuario autenticado.",
      401
    );
  }

  if (!user?.id) {
    throw new WhatsappPacoteCheckoutServiceError("Usuario nao autenticado.", 401);
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id_salao, status, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    throw new WhatsappPacoteCheckoutServiceError(
      "Erro ao validar vinculo com o salao.",
      500
    );
  }

  const usuarioRow = usuario as UsuarioRow | null;

  if (!usuarioRow?.id_salao) {
    throw new WhatsappPacoteCheckoutServiceError("Usuario sem salao vinculado.", 403);
  }

  if (String(usuarioRow.status || "").toLowerCase() !== "ativo") {
    throw new WhatsappPacoteCheckoutServiceError("Usuario inativo.", 403);
  }

  if (String(usuarioRow.nivel || "").toLowerCase() !== "admin") {
    throw new WhatsappPacoteCheckoutServiceError(
      "Somente administrador pode comprar pacotes de WhatsApp.",
      403
    );
  }

  return usuarioRow.id_salao;
}

async function carregarPacote(pacoteId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("whatsapp_pacotes")
    .select("id, nome, quantidade_creditos, preco, ativo")
    .eq("id", pacoteId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    throw new WhatsappPacoteCheckoutServiceError(
      "Erro ao carregar pacote de WhatsApp.",
      500
    );
  }

  const pacote = data as PacoteRow | null;

  if (!pacote?.id) {
    throw new WhatsappPacoteCheckoutServiceError(
      "Pacote de WhatsApp nao encontrado.",
      404
    );
  }

  return pacote;
}

async function carregarSalao(idSalao: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("saloes")
    .select("id, nome, responsavel, email, telefone, whatsapp, cpf_cnpj")
    .eq("id", idSalao)
    .maybeSingle();

  if (error) {
    throw new WhatsappPacoteCheckoutServiceError(
      "Erro ao carregar dados do salao.",
      500
    );
  }

  const salao = data as SalaoRow | null;

  if (!salao?.id) {
    throw new WhatsappPacoteCheckoutServiceError("Salao nao encontrado.", 404);
  }

  if (!String(salao.email || "").trim()) {
    throw new WhatsappPacoteCheckoutServiceError(
      "O salao precisa ter e-mail cadastrado para comprar pacote.",
      400
    );
  }

  return salao;
}

async function buscarCompraPendente(idSalao: string, pacoteId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("whatsapp_pacote_compras")
    .select(
      "id, status, billing_type, valor, quantidade_creditos, asaas_payment_id, invoice_url, bank_slip_url, pix_copia_cola, qr_code_base64"
    )
    .eq("id_salao", idSalao)
    .eq("id_pacote", pacoteId)
    .in("status", ["pendente", "vencido"])
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new WhatsappPacoteCheckoutServiceError(
      "Erro ao verificar compras pendentes do pacote.",
      500
    );
  }

  return (data as CompraExistenteRow | null) ?? null;
}

export function createWhatsappPacoteCheckoutService() {
  return {
    async criarCheckout(params: {
      pacoteId: string;
      billingType?: BillingType;
      idempotencyKey?: string | null;
    }) {
      const idSalao = await validarSalaoAdmin();
      const pacote = await carregarPacote(params.pacoteId);
      const compraExistente = await buscarCompraPendente(idSalao, pacote.id);

      if (compraExistente?.id && compraExistente.asaas_payment_id) {
        return {
          ok: true as const,
          reused: true,
          checkoutId: compraExistente.id,
          paymentId: compraExistente.asaas_payment_id,
          billingType: String(compraExistente.billing_type || "PIX") as BillingType,
          valor: toMoney(compraExistente.valor),
          quantidadeCreditos: Number(compraExistente.quantidade_creditos || 0),
          invoiceUrl: compraExistente.invoice_url || null,
          bankSlipUrl: compraExistente.bank_slip_url || null,
          pixCopiaCola: compraExistente.pix_copia_cola || null,
          qrCodeBase64: compraExistente.qr_code_base64 || null,
        };
      }

      const salao = await carregarSalao(idSalao);
      const billingType = params.billingType || "PIX";
      const quantidadeCreditos = Math.max(Number(pacote.quantidade_creditos || 0), 0);
      const valor = toMoney(pacote.preco);

      if (valor <= 0 || quantidadeCreditos <= 0) {
        throw new WhatsappPacoteCheckoutServiceError(
          "Pacote invalido para cobranca.",
          400
        );
      }

      const clienteAsaas = await criarOuBuscarCliente({
        nome: String(salao.responsavel || salao.nome || "SalaoPremium").trim(),
        email: String(salao.email || "").trim(),
        cpfCnpj: onlyNumbers(salao.cpf_cnpj),
        telefone: onlyNumbers(salao.whatsapp || salao.telefone),
      });

      const supabaseAdmin = getSupabaseAdmin();
      const compraId = randomUUID();
      const externalReference = `whatsapp_package:${compraId}`;
      const idempotencyKey = String(
        params.idempotencyKey || `${idSalao}:${pacote.id}:${billingType}`
      ).trim();

      const { error: insertError } = await supabaseAdmin
        .from("whatsapp_pacote_compras")
        .insert({
          id: compraId,
          id_salao: idSalao,
          id_pacote: pacote.id,
          status: "pendente",
          billing_type: billingType,
          valor,
          quantidade_creditos: quantidadeCreditos,
          idempotency_key: idempotencyKey,
          external_reference: externalReference,
          asaas_customer_id: String(clienteAsaas.id || "").trim() || null,
        });

      if (insertError) {
        throw new WhatsappPacoteCheckoutServiceError(
          insertError.message || "Erro ao criar checkout do pacote.",
          500
        );
      }

      const cobranca = await criarCobranca({
        customerId: String(clienteAsaas.id || "").trim(),
        billingType,
        valor,
        descricao: `Pacote WhatsApp ${pacote.nome} - SalaoPremium`,
        vencimento: format(addDays(new Date(), 2), "yyyy-MM-dd"),
        referenciaExterna: externalReference,
      });

      const paymentId = String(cobranca.id || "").trim();

      if (!paymentId) {
        throw new WhatsappPacoteCheckoutServiceError(
          "O provedor nao retornou um pagamento valido para o pacote.",
          502
        );
      }

      let qrCodeBase64: string | null = null;
      let pixCopiaCola: string | null = null;

      if (billingType === "PIX") {
        try {
          const pix = await buscarQrCodePix(paymentId);
          qrCodeBase64 =
            String(pix.encodedImage || "").trim() ||
            String(pix.payload || "").trim() ||
            null;
          pixCopiaCola =
            String(pix.payload || "").trim() ||
            pixCopiaCola ||
            null;
        } catch {
          qrCodeBase64 = null;
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("whatsapp_pacote_compras")
        .update({
          asaas_payment_id: paymentId,
          invoice_url: String(cobranca.invoiceUrl || "").trim() || null,
          bank_slip_url: String(cobranca.bankSlipUrl || "").trim() || null,
          pix_copia_cola: pixCopiaCola,
          qr_code_base64: qrCodeBase64,
          response_json: cobranca,
        })
        .eq("id", compraId);

      if (updateError) {
        throw new WhatsappPacoteCheckoutServiceError(
          updateError.message || "Erro ao atualizar checkout do pacote.",
          500
        );
      }

      return {
        ok: true as const,
        reused: false,
        checkoutId: compraId,
        paymentId,
        billingType,
        valor,
        quantidadeCreditos,
        invoiceUrl: String(cobranca.invoiceUrl || "").trim() || null,
        bankSlipUrl: String(cobranca.bankSlipUrl || "").trim() || null,
        pixCopiaCola,
        qrCodeBase64,
      };
    },
  };
}
