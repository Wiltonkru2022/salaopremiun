import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";

loadLocalEnv();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const outputPath = ".codex-test-accounts.local.json";
const nowIso = new Date().toISOString();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function readExistingPassword() {
  if (!fs.existsSync(outputPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    return typeof parsed.password === "string" && parsed.password.length >= 12
      ? parsed.password
      : null;
  } catch {
    return null;
  }
}

const password =
  process.env.E2E_TEST_PASSWORD ||
  readExistingPassword() ||
  `SpE2E!${randomBytes(8).toString("hex")}`;

const personas = [
  {
    key: "basico",
    plan: "basico",
    email: "e2e+basico@salaopremiun.local",
    name: "Salao Basico E2E",
    owner: "Responsavel Basico E2E",
    cpf: "11122233344",
    city: "Sao Paulo",
    district: "Pinheiros",
    street: "Rua dos Pinheiros",
    number: "101",
  },
  {
    key: "pro",
    plan: "pro",
    email: "e2e+pro@salaopremiun.local",
    name: "Salao Pro E2E",
    owner: "Responsavel Pro E2E",
    cpf: "22233344455",
    city: "Sao Paulo",
    district: "Moema",
    street: "Avenida Ibirapuera",
    number: "202",
  },
  {
    key: "premium",
    plan: "premium",
    email: "e2e+premium@salaopremiun.local",
    name: "Salao Premium E2E",
    owner: "Responsavel Premium E2E",
    cpf: "33344455566",
    city: "Tres Lagoas",
    district: "Santa Rita",
    street: "Rua Manoel Jorge",
    number: "1433",
  },
];

async function findAuthUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) return found;
    if (!data.users.length || data.users.length < 1000) return null;
    page += 1;
  }
}

async function upsertAuthUser(email, nome) {
  const existing = await findAuthUserByEmail(email);
  if (existing?.id) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error) throw error;
  return data.user;
}

async function getPlanLimits(plan) {
  const { data } = await supabase
    .from("planos_saas")
    .select("limite_usuarios, limite_profissionais, valor_mensal")
    .eq("codigo", plan)
    .maybeSingle();
  return {
    limite_usuarios: data?.limite_usuarios ?? (plan === "premium" ? 999 : 3),
    limite_profissionais:
      data?.limite_profissionais ?? (plan === "premium" ? 999 : 3),
    valor_mensal: data?.valor_mensal ?? 0,
  };
}

async function upsertSalon(persona, authUserId) {
  const limits = await getPlanLimits(persona.plan);
  const common = {
    nome: persona.name,
    nome_fantasia: persona.name,
    responsavel: persona.owner,
    email: persona.email,
    telefone: "11999999999",
    whatsapp: "11999999999",
    cpf_cnpj: persona.cpf,
    cep: "01001000",
    endereco: persona.street,
    numero: persona.number,
    bairro: persona.district,
    cidade: persona.city,
    estado: "SP",
    status: "ativo",
    trial_ativo: false,
    plano: persona.plan,
    limite_usuarios: limits.limite_usuarios,
    limite_profissionais: limits.limite_profissionais,
    descricao_publica:
      persona.plan === "premium"
        ? "Salao premium E2E publicado para validar marketplace, valores e agendamento online."
        : `Salao ${persona.plan} E2E para validar painel e bloqueios de plano.`,
    estacionamento: persona.plan === "premium",
    formas_pagamento_publico: ["Pix", "Credito", "Debito"],
    app_cliente_publicado: persona.plan === "premium",
    updated_at: nowIso,
  };

  const { data: existing } = await supabase
    .from("saloes")
    .select("id")
    .eq("email", persona.email)
    .maybeSingle();

  let idSalao = existing?.id;
  if (idSalao) {
    const { error } = await supabase.from("saloes").update(common).eq("id", idSalao);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("saloes")
      .insert({ ...common, created_at: nowIso })
      .select("id")
      .single();
    if (error) throw error;
    idSalao = data.id;
  }

  const { data: userRow } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", persona.email)
    .maybeSingle();
  const userPayload = {
    auth_user_id: authUserId,
    email: persona.email,
    nome: persona.owner,
    id_salao: idSalao,
    nivel: "admin",
    status: "ativo",
    updated_at: nowIso,
  };
  if (userRow?.id) {
    const { error } = await supabase
      .from("usuarios")
      .update(userPayload)
      .eq("id", userRow.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("usuarios")
      .insert({ ...userPayload, created_at: nowIso });
    if (error) throw error;
  }

  const { data: assinatura } = await supabase
    .from("assinaturas")
    .select("id")
    .eq("id_salao", idSalao)
    .maybeSingle();
  const assinaturaPayload = {
    id_salao: idSalao,
    plano: persona.plan,
    valor: limits.valor_mensal,
    status: "ativo",
    limite_usuarios: limits.limite_usuarios,
    limite_profissionais: limits.limite_profissionais,
    trial_ativo: false,
    vencimento_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    updated_at: nowIso,
  };
  if (assinatura?.id) {
    const { error } = await supabase
      .from("assinaturas")
      .update(assinaturaPayload)
      .eq("id", assinatura.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("assinaturas")
      .insert({ ...assinaturaPayload, created_at: nowIso });
    if (error) throw error;
  }

  const { data: config } = await supabase
    .from("configuracoes_salao")
    .select("id")
    .eq("id_salao", idSalao)
    .maybeSingle();
  const configPayload = {
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
    updated_at: nowIso,
  };
  if (config?.id) {
    const { error } = await supabase
      .from("configuracoes_salao")
      .update(configPayload)
      .eq("id", config.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("configuracoes_salao")
      .insert({ ...configPayload, created_at: nowIso });
    if (error) throw error;
  }

  return idSalao;
}

async function upsertProfessional(persona, idSalao) {
  const cpf = persona.plan === "basico" ? "10020030040" : persona.plan === "pro" ? "20030040050" : "30040050060";
  const { data: existing } = await supabase
    .from("profissionais")
    .select("id")
    .eq("id_salao", idSalao)
    .eq("cpf", cpf)
    .maybeSingle();
  const payload = {
    id_salao: idSalao,
    nome: `Profissional ${persona.plan.toUpperCase()} E2E`,
    nome_exibicao: `Pro ${persona.plan.toUpperCase()} E2E`,
    cpf,
    telefone: "11988887777",
    whatsapp: "11988887777",
    email: `e2e+prof-${persona.plan}@salaopremiun.local`,
    status: "ativo",
    ativo: true,
    tipo_profissional: "profissional",
    eh_assistente: false,
    pode_usar_sistema: true,
    especialidade_publica: "Cortes e finalizacao",
    bio_publica: "Profissional E2E para validar agenda e app profissional.",
    app_cliente_visivel: persona.plan === "premium",
    ordem_agenda: 1,
  };
  let idProfissional = existing?.id;
  if (idProfissional) {
    const { error } = await supabase
      .from("profissionais")
      .update(payload)
      .eq("id", idProfissional);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("profissionais")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    idProfissional = data.id;
  }

  const senhaHash = await bcrypt.hash(password, 10);
  const { data: acesso } = await supabase
    .from("profissionais_acessos")
    .select("id")
    .eq("cpf", cpf)
    .maybeSingle();
  const acessoPayload = {
    id_profissional: idProfissional,
    cpf,
    senha_hash: senhaHash,
    ativo: true,
    atualizado_em: nowIso,
  };
  if (acesso?.id) {
    const { error } = await supabase
      .from("profissionais_acessos")
      .update(acessoPayload)
      .eq("id", acesso.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("profissionais_acessos")
      .insert({ ...acessoPayload, criado_em: nowIso });
    if (error) throw error;
  }

  return { idProfissional, cpf };
}

async function upsertServices(persona, idSalao, idProfissional) {
  const services = [
    {
      nome: `Corte ${persona.plan.toUpperCase()} E2E`,
      preco: 79.9,
      exige_avaliacao: false,
      descricao_publica: "Servico E2E com valor visivel no app cliente.",
    },
    {
      nome: `Coloracao ${persona.plan.toUpperCase()} E2E`,
      preco: 0,
      exige_avaliacao: true,
      descricao_publica: "Servico E2E sob avaliacao antes de confirmar valor.",
    },
  ];

  const ids = [];
  for (const service of services) {
    const { data: existing } = await supabase
      .from("servicos")
      .select("id")
      .eq("id_salao", idSalao)
      .eq("nome", service.nome)
      .maybeSingle();
    const payload = {
      id_salao: idSalao,
      nome: service.nome,
      descricao: service.descricao_publica,
      descricao_publica: service.descricao_publica,
      duracao: 45,
      duracao_minutos: 45,
      preco: service.preco,
      preco_padrao: service.preco,
      status: "ativo",
      ativo: true,
      exige_avaliacao: service.exige_avaliacao,
      categoria: "Cabelo",
      app_cliente_visivel: persona.plan === "premium",
      atualizado_em: nowIso,
      updated_at: nowIso,
    };
    let idServico = existing?.id;
    if (idServico) {
      const { error } = await supabase
        .from("servicos")
        .update(payload)
        .eq("id", idServico);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("servicos")
        .insert({ ...payload, criado_em: nowIso, created_at: nowIso })
        .select("id")
        .single();
      if (error) throw error;
      idServico = data.id;
    }
    ids.push(idServico);

    const { data: link } = await supabase
      .from("profissional_servicos")
      .select("id")
      .eq("id_salao", idSalao)
      .eq("id_profissional", idProfissional)
      .eq("id_servico", idServico)
      .maybeSingle();
    const linkPayload = {
      id_salao: idSalao,
      id_profissional: idProfissional,
      id_servico: idServico,
      duracao_minutos: 45,
      ativo: true,
      updated_at: nowIso,
    };
    if (link?.id) {
      const { error } = await supabase
        .from("profissional_servicos")
        .update(linkPayload)
        .eq("id", link.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("profissional_servicos")
        .insert({ ...linkPayload, created_at: nowIso });
      if (error) throw error;
    }
  }
  return ids;
}

async function upsertClient(idSalaoPremium) {
  const email = "e2e+cliente@salaopremiun.local";
  const senhaHash = await bcrypt.hash(password, 10);
  const { data: account } = await supabase
    .from("clientes_app_auth")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  const accountPayload = {
    nome: "Cliente App E2E",
    email,
    telefone: "11977776666",
    senha_hash: senhaHash,
    ativo: true,
    updated_at: nowIso,
  };
  let idConta = account?.id;
  if (idConta) {
    const { error } = await supabase
      .from("clientes_app_auth")
      .update(accountPayload)
      .eq("id", idConta);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("clientes_app_auth")
      .insert(accountPayload)
      .select("id")
      .single();
    if (error) throw error;
    idConta = data.id;
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("id_salao", idSalaoPremium)
    .eq("email", email)
    .maybeSingle();
  const clientePayload = {
    id_salao: idSalaoPremium,
    nome: "Cliente App E2E",
    email,
    telefone: "11977776666",
    whatsapp: "11977776666",
    status: "ativo",
    ativo: "ativo",
    atualizado_em: nowIso,
  };
  let idCliente = cliente?.id;
  if (idCliente) {
    const { error } = await supabase
      .from("clientes")
      .update(clientePayload)
      .eq("id", idCliente);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("clientes")
      .insert(clientePayload)
      .select("id")
      .single();
    if (error) throw error;
    idCliente = data.id;
  }

  const { data: auth } = await supabase
    .from("clientes_auth")
    .select("id")
    .eq("id_salao", idSalaoPremium)
    .eq("email", email)
    .maybeSingle();
  const authPayload = {
    id_salao: idSalaoPremium,
    id_cliente: idCliente,
    email,
    senha_hash: senhaHash,
    app_ativo: true,
    app_conta_id: idConta,
    updated_at: nowIso,
  };
  if (auth?.id) {
    const { error } = await supabase
      .from("clientes_auth")
      .update(authPayload)
      .eq("id", auth.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("clientes_auth")
      .insert({ ...authPayload, created_at: nowIso });
    if (error) throw error;
  }

  return { idConta, idCliente, email };
}

async function upsertAdminMaster() {
  const email = "e2e+admin-master@salaopremiun.local";
  const authUser = await upsertAuthUser(email, "Admin Master E2E");
  const { data: admin } = await supabase
    .from("admin_master_usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  const payload = {
    auth_user_id: authUser.id,
    email,
    nome: "Admin Master E2E",
    perfil: "owner",
    status: "ativo",
    atualizado_em: nowIso,
  };
  let idAdmin = admin?.id;
  if (idAdmin) {
    const { error } = await supabase
      .from("admin_master_usuarios")
      .update(payload)
      .eq("id", idAdmin);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("admin_master_usuarios")
      .insert({ ...payload, criado_em: nowIso })
      .select("id")
      .single();
    if (error) throw error;
    idAdmin = data.id;
  }
  return { idAdmin, email };
}

const result = {
  createdAt: nowIso,
  baseUrlHint: process.env.E2E_BASE_URL || "http://localhost:3000",
  password,
  salons: {},
  client: null,
  adminMaster: null,
};

for (const persona of personas) {
  const authUser = await upsertAuthUser(persona.email, persona.owner);
  const idSalao = await upsertSalon(persona, authUser.id);
  const professional = await upsertProfessional(persona, idSalao);
  const services = await upsertServices(persona, idSalao, professional.idProfissional);
  result.salons[persona.key] = {
    plan: persona.plan,
    idSalao,
    email: persona.email,
    professionalCpf: professional.cpf,
    serviceIds: services,
  };
}

result.client = await upsertClient(result.salons.premium.idSalao);
result.adminMaster = await upsertAdminMaster();

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      ok: true,
      outputPath,
      salons: Object.fromEntries(
        Object.entries(result.salons).map(([key, value]) => [
          key,
          { idSalao: value.idSalao, email: value.email, plan: value.plan },
        ])
      ),
      clientEmail: result.client.email,
      adminMasterEmail: result.adminMaster.email,
    },
    null,
    2
  )
);
