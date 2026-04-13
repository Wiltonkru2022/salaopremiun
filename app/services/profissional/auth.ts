import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/profissional-auth.server";

type LoginResult =
  | {
      ok: true;
      session: {
        idProfissional: string;
        idSalao: string;
        nome: string;
        cpf: string;
        tipo: "profissional";
      };
    }
  | {
      ok: false;
      error: string;
    };

function normalizeCpf(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

export async function loginProfissionalByCpfSenha(
  cpf: string,
  senha: string
): Promise<LoginResult> {
  const supabaseAdmin = getSupabaseAdmin();

  const cpfLimpo = normalizeCpf(cpf);
  const senhaLimpa = String(senha || "").trim();

  console.log("CPF recebido:", cpf);
  console.log("CPF limpo:", cpfLimpo);
  console.log("Senha recebida:", senhaLimpa);

  const { data: acesso, error: acessoError } = await supabaseAdmin
    .from("profissionais_acessos")
    .select("id, cpf, senha_hash, ativo, id_profissional")
    .eq("cpf", cpfLimpo)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  console.log("Resultado acesso:", acesso);
  console.log("Erro acesso:", acessoError);

  if (acessoError) {
    return { ok: false, error: "Erro ao buscar acesso do profissional." };
  }

  if (!acesso) {
    return { ok: false, error: "CPF ou senha inválidos." };
  }

  const senhaOk = await verifyPassword(senhaLimpa, acesso.senha_hash);
  console.log("Senha válida:", senhaOk);

  if (!senhaOk) {
    return { ok: false, error: "CPF ou senha inválidos." };
  }

  const { data: profissional, error: profissionalError } = await supabaseAdmin
    .from("profissionais")
    .select("id, nome, nome_exibicao, ativo, id_salao")
    .eq("id", acesso.id_profissional)
    .limit(1)
    .maybeSingle();

  console.log("Profissional:", profissional);
  console.log("Erro profissional:", profissionalError);

  if (profissionalError) {
    return { ok: false, error: "Erro ao buscar profissional." };
  }

  if (!profissional) {
    return { ok: false, error: "Profissional não encontrado." };
  }

  if (!profissional.ativo) {
    return { ok: false, error: "Profissional inativo." };
  }

  if (!profissional.id_salao) {
    return { ok: false, error: "Profissional sem salão vinculado." };
  }

  const { data: salao, error: salaoError } = await supabaseAdmin
    .from("saloes")
    .select("id, nome, status")
    .eq("id", profissional.id_salao)
    .limit(1)
    .maybeSingle();

  console.log("Salão:", salao);
  console.log("Erro salão:", salaoError);

  if (salaoError) {
    return { ok: false, error: "Erro ao buscar salão." };
  }

  if (!salao) {
    return { ok: false, error: "Salão não encontrado." };
  }

  if (String(salao.status || "").toLowerCase() !== "ativo") {
    return { ok: false, error: "Salão inativo ou bloqueado." };
  }

  await supabaseAdmin
    .from("profissionais_acessos")
    .update({ ultimo_login_em: new Date().toISOString() })
    .eq("id", acesso.id);

  return {
    ok: true,
    session: {
      idProfissional: profissional.id,
      idSalao: profissional.id_salao,
      nome: profissional.nome_exibicao || profissional.nome,
      cpf: cpfLimpo,
      tipo: "profissional",
    },
  };
}