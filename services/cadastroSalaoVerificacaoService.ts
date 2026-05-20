import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SalaoExistsRow = {
  id?: string | null;
};

export type CadastroSalaoVerificacaoPayload = {
  email: string;
  nomeSalao: string;
  whatsapp: string;
  cpfCnpj: string;
};

export async function verificarCadastroSalaoDuplicado({
  email,
  nomeSalao,
  whatsapp,
  cpfCnpj,
}: CadastroSalaoVerificacaoPayload) {
  const supabase = getSupabaseAdmin();
  const exists = {
    email: false,
    nomeSalao: false,
    whatsapp: false,
    cpfCnpj: false,
  };

  const checks: PromiseLike<void>[] = [];

  if (email) {
    checks.push(
      supabase
        .from("saloes")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle()
        .then(({ data }: { data: SalaoExistsRow | null }) => {
          exists.email = Boolean(data?.id);
        })
    );
  }

  if (nomeSalao) {
    checks.push(
      supabase
        .from("saloes")
        .select("id")
        .ilike("nome", nomeSalao)
        .limit(1)
        .maybeSingle()
        .then(({ data }: { data: SalaoExistsRow | null }) => {
          exists.nomeSalao = Boolean(data?.id);
        })
    );
  }

  if (whatsapp) {
    checks.push(
      supabase
        .from("saloes")
        .select("id")
        .or(`telefone.eq.${whatsapp},telefone.ilike.%${whatsapp}%`)
        .limit(1)
        .maybeSingle()
        .then(({ data }: { data: SalaoExistsRow | null }) => {
          exists.whatsapp = Boolean(data?.id);
        })
    );
  }

  if (cpfCnpj) {
    checks.push(
      supabase
        .from("saloes")
        .select("id")
        .or(`cpf_cnpj.eq.${cpfCnpj},cpf_cnpj.ilike.%${cpfCnpj}%`)
        .limit(1)
        .maybeSingle()
        .then(({ data }: { data: SalaoExistsRow | null }) => {
          exists.cpfCnpj = Boolean(data?.id);
        })
    );
  }

  await Promise.all(checks);
  return exists;
}
