import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  normalizarEmailCliente,
  normalizarTelefoneCliente,
} from "@/core/entities/cliente";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

export function createClienteService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    async verificarDuplicidade(params: {
      idSalao: string;
      idClienteAtual?: string | null;
      email?: string | null;
      whatsapp?: string | null;
      telefone?: string | null;
      cpf?: string | null;
    }) {
      const email = normalizarEmailCliente(params.email);
      const whatsapp = normalizarTelefoneCliente(params.whatsapp);
      const telefone = normalizarTelefoneCliente(params.telefone);
      const cpf = normalizarTelefoneCliente(params.cpf);

      if (email) {
        const { data, error } = await supabaseAdmin
          .from("clientes")
          .select("id, nome, email")
          .eq("id_salao", params.idSalao)
          .eq("email", email);

        if (error) throw error;

        const duplicado = (data || []).find(
          (item) => item.id !== params.idClienteAtual
        );

        if (duplicado) {
          throw new Error(
            `Ja existe cliente com este e-mail: ${duplicado.nome || "cadastro existente"}.`
          );
        }
      }

      if (!whatsapp && !telefone && !cpf) return;

      const { data, error } = await supabaseAdmin
        .from("clientes")
        .select("id, nome, whatsapp, telefone, cpf")
        .eq("id_salao", params.idSalao);

      if (error) throw error;

      const duplicadoContato = (data || []).find((item) => {
        if (item.id === params.idClienteAtual) return false;
        const itemWhatsapp = normalizarTelefoneCliente(item.whatsapp);
        const itemTelefone = normalizarTelefoneCliente(item.telefone);
        const itemCpf = normalizarTelefoneCliente(item.cpf);

        return Boolean(
          (whatsapp &&
            (whatsapp === itemWhatsapp || whatsapp === itemTelefone)) ||
            (telefone &&
              (telefone === itemTelefone || telefone === itemWhatsapp)) ||
            (cpf && cpf === itemCpf)
        );
      });

      if (duplicadoContato) {
        throw new Error(
          `Ja existe cliente com contato ou CPF parecido: ${duplicadoContato.nome || "cadastro existente"}.`
        );
      }
    },

    async salvar(params: {
      idSalao: string;
      idCliente?: string | null;
      payload: Record<string, unknown>;
    }) {
      if (params.idCliente) {
        const { data, error } = await supabaseAdmin
          .from("clientes")
          .update(params.payload)
          .eq("id", params.idCliente)
          .eq("id_salao", params.idSalao)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data?.id) throw new Error("Cliente nao encontrado para atualizacao.");

        return {
          idCliente: String(data.id),
        };
      }

      const { data, error } = await supabaseAdmin
        .from("clientes")
        .insert(params.payload)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error("Nao foi possivel obter o ID da cliente.");

      return {
        idCliente: String(data.id),
      };
    },

    async alterarStatus(params: {
      idSalao: string;
      idCliente: string;
      ativo: boolean;
    }) {
      const { data, error } = await supabaseAdmin
        .from("clientes")
        .update({
          ativo: params.ativo,
          status: params.ativo ? "ativo" : "inativo",
        })
        .eq("id", params.idCliente)
        .eq("id_salao", params.idSalao)
        .select("id, ativo, status")
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error("Cliente nao encontrada para alterar status.");

      return {
        idCliente: String(data.id),
        ativo: Boolean(data.ativo),
        status: String(data.status || ""),
      };
    },

    async contarDependenciasExclusao(params: {
      idSalao: string;
      idCliente: string;
    }) {
      const [
        { count: agendamentosCount, error: agendamentosError },
        { count: comandasCount, error: comandasError },
      ] = await Promise.all([
        supabaseAdmin
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", params.idSalao)
          .eq("cliente_id", params.idCliente),
        supabaseAdmin
          .from("comandas")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", params.idSalao)
          .eq("id_cliente", params.idCliente),
      ]);

      if (agendamentosError) throw agendamentosError;
      if (comandasError) throw comandasError;

      return {
        agendamentosCount: agendamentosCount || 0,
        comandasCount: comandasCount || 0,
      };
    },

    async upsertByCliente(params: {
      table:
        | "clientes_ficha_tecnica"
        | "clientes_preferencias"
        | "clientes_autorizacoes"
        | "clientes_auth";
      payload: Record<string, unknown>;
      idSalao: string;
      idCliente: string;
    }) {
      const { data: existing, error: findError } = await supabaseAdmin
        .from(params.table)
        .select("id")
        .eq("id_salao", params.idSalao)
        .eq("id_cliente", params.idCliente)
        .limit(1);

      if (findError) throw findError;

      if (existing?.[0]?.id) {
        const { error } = await supabaseAdmin
          .from(params.table)
          .update(params.payload)
          .eq("id_salao", params.idSalao)
          .eq("id_cliente", params.idCliente);

        if (error) throw error;
        return;
      }

      const { error } = await supabaseAdmin
        .from(params.table)
        .insert(params.payload);

      if (error) throw error;
    },

    async excluir(params: { idSalao: string; idCliente: string }) {
      const deletionResults = await Promise.all([
        supabaseAdmin
          .from("clientes_ficha_tecnica")
          .delete()
          .eq("id_salao", params.idSalao)
          .eq("id_cliente", params.idCliente),
        supabaseAdmin
          .from("clientes_preferencias")
          .delete()
          .eq("id_salao", params.idSalao)
          .eq("id_cliente", params.idCliente),
        supabaseAdmin
          .from("clientes_autorizacoes")
          .delete()
          .eq("id_salao", params.idSalao)
          .eq("id_cliente", params.idCliente),
        supabaseAdmin
          .from("clientes_auth")
          .delete()
          .eq("id_salao", params.idSalao)
          .eq("id_cliente", params.idCliente),
        supabaseAdmin
          .from("clientes_historico")
          .delete()
          .eq("id_salao", params.idSalao)
          .eq("id_cliente", params.idCliente),
      ]);

      for (const result of deletionResults) {
        if (result.error) throw result.error;
      }

      const { error } = await supabaseAdmin
        .from("clientes")
        .delete()
        .eq("id", params.idCliente)
        .eq("id_salao", params.idSalao);

      if (error) throw error;

      return {
        idCliente: params.idCliente,
      };
    },
  };
}

export type ClienteService = ReturnType<typeof createClienteService>;
