import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";

loadLocalEnv();
requireEnv(["NEON_ADMIN_DATABASE_URL", "CLERK_SECRET_KEY"]);

const outputPath = process.env.E2E_TEST_ACCOUNTS_FILE || ".codex-test-accounts.local.json";
const databaseUrl = process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL;
const clerkSecret = String(process.env.CLERK_SECRET_KEY || "").trim();
const nowIso = new Date().toISOString();
const pool = new Pool({ connectionString: databaseUrl });

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

const password = process.env.E2E_TEST_PASSWORD || readExistingPassword() || `SpE2e!${randomBytes(8).toString("hex")}`;

const personas = [
  { key: "basico", plan: "basico", email: "e2e+basico@salaopremiun.local", name: "Salao Basico E2E", owner: "Responsavel Basico E2E", cpf: "11122233344" },
  { key: "pro", plan: "pro", email: "e2e+pro@salaopremiun.local", name: "Salao Pro E2E", owner: "Responsavel Pro E2E", cpf: "22233344455" },
  { key: "premium", plan: "premium", email: "e2e+premium@salaopremiun.local", name: "Salao Premium E2E", owner: "Responsavel Premium E2E", cpf: "33344455566" },
];

async function clerkRequest(path, init = {}) {
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Clerk ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function findClerkUser(email) {
  const users = await clerkRequest(`/users?email_address=${encodeURIComponent(email)}&limit=20`);
  return Array.isArray(users)
    ? users.find((user) => Array.isArray(user.email_addresses) && user.email_addresses.some((item) => String(item.email_address || "").toLowerCase() === email.toLowerCase())) || null
    : null;
}

async function upsertClerkUser(email, nome) {
  const existing = await findClerkUser(email);
  const [firstName, ...rest] = String(nome).trim().split(/\s+/);
  const lastName = rest.join(" ") || "E2E";
  if (existing?.id) {
    return clerkRequest(`/users/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ first_name: firstName, last_name: lastName, password }),
    });
  }
  return clerkRequest("/users", {
    method: "POST",
    body: JSON.stringify({ email_address: [email], password, first_name: firstName, last_name: lastName, skip_password_checks: true, skip_password_requirement: true }),
  });
}

async function one(client, text, values = []) {
  const result = await client.query(text, values);
  return result.rows?.[0] || null;
}

async function upsertSalon(client, persona, clerkUserId) {
  const existing = await one(client, "select id from saloes where lower(email)=lower($1) limit 1", [persona.email]);
  const idSalao = existing?.id || randomUUID();
  if (existing?.id) {
    await client.query("update saloes set nome=$2,responsavel=$3,cpf_cnpj=$4,status='ativo',plano=$5,updated_at=$6 where id=$1", [idSalao, persona.name, persona.owner, persona.cpf, persona.plan, nowIso]);
  } else {
    await client.query("insert into saloes (id,nome,responsavel,email,telefone,whatsapp,cpf_cnpj,status,plano,created_at,updated_at) values ($1,$2,$3,$4,'11999999999','11999999999',$5,'ativo',$6,$7,$7)", [idSalao, persona.name, persona.owner, persona.email, persona.cpf, persona.plan, nowIso]);
  }

  const user = await one(client, "select id from usuarios where lower(email)=lower($1) limit 1", [persona.email]);
  if (user?.id) {
    await client.query("update usuarios set auth_user_id=$2,nome=$3,id_salao=$4,nivel='admin',status='ativo',updated_at=$5 where id=$1", [user.id, clerkUserId, persona.owner, idSalao, nowIso]);
  } else {
    await client.query("insert into usuarios (id,auth_user_id,email,nome,id_salao,nivel,status,created_at,updated_at) values ($1,$2,$3,$4,$5,'admin','ativo',$6,$6)", [randomUUID(), clerkUserId, persona.email, persona.owner, idSalao, nowIso]);
  }
  return idSalao;
}

async function ensurePremiumFixtures(client, idSalao) {
  const professionalCpf = "30040050060";
  const professional = await one(client, "select id from profissionais where id_salao=$1 and cpf=$2 limit 1", [idSalao, professionalCpf]);
  const idProfissional = professional?.id || randomUUID();
  if (professional?.id) {
    await client.query("update profissionais set nome='Profissional PREMIUM E2E',nome_exibicao='Pro PREMIUM E2E',status='ativo',ativo=true,pix_tipo='CPF',pix_chave=$2 where id=$1", [idProfissional, professionalCpf]);
  } else {
    await client.query("insert into profissionais (id,id_salao,nome,nome_exibicao,cpf,telefone,whatsapp,email,status,ativo,pix_tipo,pix_chave) values ($1,$2,'Profissional PREMIUM E2E','Pro PREMIUM E2E',$3,'11988887777','11988887777','e2e+prof-premium@salaopremiun.local','ativo',true,'CPF',$3)", [idProfissional, idSalao, professionalCpf]);
  }

  const senhaHash = await bcrypt.hash(password, 10);
  const access = await one(client, "select id from profissionais_acessos where cpf=$1 limit 1", [professionalCpf]);
  if (access?.id) {
    await client.query("update profissionais_acessos set id_profissional=$2,senha_hash=$3,ativo=true,atualizado_em=$4 where id=$1", [access.id, idProfissional, senhaHash, nowIso]);
  } else {
    await client.query("insert into profissionais_acessos (id,id_profissional,cpf,senha_hash,ativo,criado_em,atualizado_em) values ($1,$2,$3,$4,true,$5,$5)", [randomUUID(), idProfissional, professionalCpf, senhaHash, nowIso]);
  }

  const service = await one(client, "select id from servicos where id_salao=$1 and nome='Corte PREMIUM E2E' limit 1", [idSalao]);
  const idServico = service?.id || randomUUID();
  if (service?.id) {
    await client.query("update servicos set preco=79.90,duracao=120,duracao_minutos=120,status='ativo',ativo=true where id=$1", [idServico]);
  } else {
    await client.query("insert into servicos (id,id_salao,nome,descricao,duracao,duracao_minutos,preco,status,ativo,categoria) values ($1,$2,'Corte PREMIUM E2E','Servico E2E',120,120,79.90,'ativo',true,'Cabelo')", [idServico, idSalao]);
  }

  const clientEmail = "e2e+cliente@salaopremiun.local";
  const existingClient = await one(client, "select id from clientes where id_salao=$1 and lower(email)=lower($2) limit 1", [idSalao, clientEmail]);
  const idCliente = existingClient?.id || randomUUID();
  if (existingClient?.id) {
    await client.query("update clientes set nome='Cliente App E2E',whatsapp='11977776666' where id=$1", [idCliente]);
  } else {
    await client.query("insert into clientes (id,id_salao,nome,email,whatsapp,telefone,created_at) values ($1,$2,'Cliente App E2E',$3,'11977776666','11977776666',$4)", [idCliente, idSalao, clientEmail, nowIso]);
  }

  return { professionalCpf, idProfissional, serviceIds: [idServico], idCliente, clientEmail };
}

const result = { baseUrlHint: process.env.E2E_BASE_URL || "http://localhost:3000", password, salons: {}, client: null };
const client = await pool.connect();
try {
  await client.query("begin");
  for (const persona of personas) {
    const clerkUser = await upsertClerkUser(persona.email, persona.owner);
    const idSalao = await upsertSalon(client, persona, clerkUser.id);
    result.salons[persona.key] = { idSalao, email: persona.email, clerkUserId: clerkUser.id };
    if (persona.key === "premium") {
      const fixtures = await ensurePremiumFixtures(client, idSalao);
      Object.assign(result.salons.premium, fixtures);
      result.client = { email: fixtures.clientEmail, idCliente: fixtures.idCliente };
    }
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Contas E2E Clerk + Neon gravadas em ${outputPath}`);
