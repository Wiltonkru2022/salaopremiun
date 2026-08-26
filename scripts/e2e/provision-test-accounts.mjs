import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";

loadLocalEnv();
requireEnv(["NEON_ADMIN_DATABASE_URL", "E2E_TEST_PASSWORD"]);

const outputPath = process.env.E2E_TEST_ACCOUNTS_FILE || ".codex-test-accounts.local.json";
const sql = neon(process.env.NEON_ADMIN_DATABASE_URL);
const password = process.env.E2E_TEST_PASSWORD;
const baseUrlHint = process.env.E2E_BASE_URL || "http://localhost:3000";

const personas = [
  {
    key: "basico",
    plan: "basico",
    email: process.env.E2E_SALAO_BASICO_EMAIL || "e2e+basico@salaopremiun.local",
    professionalCpf: process.env.E2E_PROFISSIONAL_BASICO_CPF || "10020030040",
    servicePrefix: "BASICO",
  },
  {
    key: "pro",
    plan: "pro",
    email: process.env.E2E_SALAO_PRO_EMAIL || "e2e+pro@salaopremiun.local",
    professionalCpf: process.env.E2E_PROFISSIONAL_PRO_CPF || "20030040050",
    servicePrefix: "PRO",
  },
  {
    key: "premium",
    plan: "premium",
    email: process.env.E2E_SALAO_PREMIUM_EMAIL || "e2e+premium@salaopremiun.local",
    professionalCpf: process.env.E2E_PROFISSIONAL_PREMIUM_CPF || "30040050060",
    servicePrefix: "PREMIUM",
  },
];

async function one(queryPromise, label) {
  const rows = await queryPromise;
  if (!rows[0]) {
    throw new Error(
      `${label} não encontrado no Neon. Prepare a fixture no banco de teste antes de executar os E2E.`
    );
  }
  return rows[0];
}

async function loadSalon(persona) {
  const salao = await one(
    sql`
      select id, plano, email
      from public.saloes
      where lower(email) = lower(${persona.email})
      limit 1
    `,
    `Salão E2E ${persona.key}`
  );

  const profissional = await one(
    sql`
      select id, cpf
      from public.profissionais
      where id_salao = ${salao.id}
        and cpf = ${persona.professionalCpf}
      limit 1
    `,
    `Profissional E2E ${persona.key}`
  );

  const services = await sql`
    select id, nome
    from public.servicos
    where id_salao = ${salao.id}
      and nome in (${`Corte ${persona.servicePrefix} E2E`}, ${`Coloracao ${persona.servicePrefix} E2E`})
    order by nome asc
  `;

  if (!services.length) {
    throw new Error(`Serviços E2E ${persona.key} não encontrados no Neon.`);
  }

  return {
    plan: salao.plano || persona.plan,
    idSalao: salao.id,
    email: salao.email || persona.email,
    professionalCpf: profissional.cpf,
    serviceIds: services.map((service) => service.id),
  };
}

async function loadClient(idSalaoPremium) {
  const email = process.env.E2E_CLIENT_EMAIL || "e2e+cliente@salaopremiun.local";
  const cliente = await one(
    sql`
      select id, email
      from public.clientes
      where id_salao = ${idSalaoPremium}
        and lower(email) = lower(${email})
      limit 1
    `,
    "Cliente App E2E"
  );

  const contaRows = await sql`
    select id
    from public.clientes_app_auth
    where lower(email) = lower(${email})
    limit 1
  `;

  return {
    idConta: contaRows[0]?.id || null,
    idCliente: cliente.id,
    email: cliente.email || email,
  };
}

async function loadAdminMaster() {
  const email = process.env.E2E_ADMIN_MASTER_EMAIL || "e2e+admin-master@salaopremiun.local";
  const rows = await sql`
    select id, email
    from public.admin_master_usuarios
    where lower(email) = lower(${email})
    limit 1
  `;
  if (!rows[0]) return null;
  return { idAdmin: rows[0].id, email: rows[0].email || email };
}

const result = {
  createdAt: new Date().toISOString(),
  baseUrlHint,
  password,
  salons: {},
  client: null,
  adminMaster: null,
};

for (const persona of personas) {
  result.salons[persona.key] = await loadSalon(persona);
}

result.client = await loadClient(result.salons.premium.idSalao);
result.adminMaster = await loadAdminMaster();

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Fixtures E2E Neon validadas e salvas em ${outputPath}.`);
