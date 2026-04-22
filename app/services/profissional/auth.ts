import { runAdminOperation } from "@/lib/supabase/admin-ops";
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
  const cpfLimpo = normalizeCpf(cpf);
  const senhaLimpa = String(senha || "").trim();

  return runAdminOperation({
    action: "profissional_auth_login_por_cpf",
    actorId: cpfLimpo || null,
    run: async (supabaseAdmin): Promise<LoginResult> => {
      const { data: acesso, error: acessoError } = await supabaseAdmin
        .from("profissionais_acessos")
        .select("id, cpf, senha_hash, ativo, id_profissional")
        .eq("cpf", cpfLimpo)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (acessoError) {
        return { ok: false, error: "Erro ao buscar acesso do profissional." };
      }

      if (!acesso) {
        return { ok: false, error: "CPF ou senha invalidos." };
      }

      const senhaOk = await verifyPassword(senhaLimpa, acesso.senha_hash);

      if (!senhaOk) {
        return { ok: false, error: "CPF ou senha invalidos." };
      }

      const { data: profissional, error: profissionalError } =
        await supabaseAdmin
          .from("profissionais")
          .select("id, nome, nome_exibicao, ativo, id_salao, tipo_profissional")
          .eq("id", acesso.id_profissional)
          .limit(1)
          .maybeSingle();

      if (profissionalError) {
        return { ok: false, error: "Erro ao buscar profissional." };
      }

      if (!profissional) {
        return { ok: false, error: "Profissional nao encontrado." };
      }

      if (!profissional.ativo) {
        return { ok: false, error: "Profissional inativo." };
      }

      if (
        String(profissional.tipo_profissional || "profissional").toLowerCase() ===
        "assistente"
      ) {
        return {
          ok: false,
          error: "Assistente do salao nao possui acesso ao app profissional.",
        };
      }

      if (!profissional.id_salao) {
        return { ok: false, error: "Profissional sem salao vinculado." };
      }

      const { data: salao, error: salaoError } = await supabaseAdmin
        .from("saloes")
        .select("id, nome, status")
        .eq("id", profissional.id_salao)
        .limit(1)
        .maybeSingle();

      if (salaoError) {
        return { ok: false, error: "Erro ao buscar salao." };
      }

      if (!salao) {
        return { ok: false, error: "Salao nao encontrado." };
      }

      if (String(salao.status || "").toLowerCase() !== "ativo") {
        return { ok: false, error: "Salao inativo ou bloqueado." };
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
          nome:
            profissional.nome_exibicao || profissional.nome || "Profissional",
          cpf: cpfLimpo,
          tipo: "profissional",
        },
      };
    },
  });
}
