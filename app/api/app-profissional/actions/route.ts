import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

function text(value: unknown, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function positiveInt(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

export async function POST(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const body = await request.json().catch(() => ({}));
    const action = text(body.action, 80);

    const result = await runAdminOperation({
      action: `app_profissional_api_${action || "invalida"}`,
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const rpc = (name: string, params: Record<string, unknown>) =>
          (supabase as any).rpc(name, params);

        const resolveTargetProfessional = async (requested?: unknown) => {
          const target = text(requested, 64) || session.idProfissional;
          if (target !== session.idProfissional && !session.podeVerAgendaTodos) {
            throw new Error("Você não possui permissão para alterar a agenda de outro profissional.");
          }

          const { data: profissional, error } = await (supabase as any)
            .from("profissionais")
            .select("id")
            .eq("id", target)
            .eq("id_salao", session.idSalao)
            .eq("ativo", true)
            .maybeSingle();
          if (error || !profissional?.id) throw new Error("Profissional não encontrado neste salão.");
          return String(profissional.id);
        };

        if (action === "criar_agendamento") {
          const target = await resolveTargetProfessional(body.profissionalId);
          const clienteId = text(body.clienteId, 64);
          const servicoId = text(body.servicoId, 64);
          const data = text(body.data, 10);
          const horaInicio = text(body.horaInicio, 8);
          if (!clienteId || !servicoId || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}/.test(horaInicio)) {
            throw new Error("Informe cliente, serviço, data e horário válidos.");
          }
          const { data: createdId, error } = await rpc("app_profissional_criar_agendamento", {
            p_profissional_id: target,
            p_cliente_id: clienteId,
            p_servico_id: servicoId,
            p_data: data,
            p_hora_inicio: horaInicio,
          });
          if (error) throw new Error(error.message);
          return { id: createdId, profissionalId: target };
        }

        if (action === "criar_cliente") {
          const nome = text(body.nome, 160);
          if (!nome) throw new Error("Informe o nome da cliente.");
          const { data: createdId, error } = await rpc("app_profissional_criar_cliente", {
            p_profissional_id: session.idProfissional,
            p_nome: nome,
            p_telefone: text(body.telefone, 40),
            p_observacoes: text(body.observacoes, 2000),
          });
          if (error) throw new Error(error.message);
          return { id: createdId };
        }

        if (action === "editar_cliente") {
          const clienteId = text(body.clienteId, 64);
          const nome = text(body.nome, 160);
          if (!clienteId || !nome) throw new Error("Cliente ou nome inválido.");
          const { error } = await rpc("app_profissional_editar_cliente", {
            p_profissional_id: session.idProfissional,
            p_cliente_id: clienteId,
            p_nome: nome,
            p_telefone: text(body.telefone, 40),
            p_observacoes: text(body.observacoes, 2000),
          });
          if (error) throw new Error(error.message);
          return { id: clienteId };
        }

        if (action === "criar_servico" || action === "editar_servico") {
          const nome = text(body.nome, 180);
          const preco = nonNegativeNumber(body.preco);
          const duracao = positiveInt(body.duracaoMinutos);
          const descricao = text(body.descricao, 2000);
          if (!nome || !Number.isFinite(preco) || duracao < 1) {
            throw new Error("Informe nome, preço e duração válidos.");
          }

          let serviceId = text(body.servicoId, 64);
          if (action === "criar_servico") {
            const { data: createdId, error } = await rpc("app_profissional_criar_servico", {
              p_profissional_id: session.idProfissional,
              p_nome: nome,
              p_preco: preco,
              p_duracao: duracao,
            });
            if (error) throw new Error(error.message);
            serviceId = String(createdId || "");
          } else {
            if (!serviceId) throw new Error("Serviço inválido.");
            const { error } = await rpc("app_profissional_editar_servico", {
              p_profissional_id: session.idProfissional,
              p_servico_id: serviceId,
              p_nome: nome,
              p_preco: preco,
              p_duracao: duracao,
            });
            if (error) throw new Error(error.message);
          }

          if (serviceId) {
            const { error: descriptionError } = await (supabase as any)
              .from("servicos")
              .update({ descricao: descricao || null })
              .eq("id", serviceId)
              .eq("id_salao", session.idSalao);
            if (descriptionError) throw new Error(descriptionError.message);
          }
          return { id: serviceId };
        }

        if (action === "trocar_senha") {
          const senha = String(body.senha || "").trim();
          if (senha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
          const { error } = await rpc("app_profissional_trocar_senha", {
            p_profissional_id: session.idProfissional,
            p_senha: senha,
          });
          if (error) throw new Error(error.message);
          return { sessionInvalidated: true };
        }

        if (action === "excluir_avaliacao") {
          const avaliacaoId = text(body.avaliacaoId, 64);
          if (!avaliacaoId) throw new Error("Avaliação inválida.");
          const { error } = await rpc("app_profissional_excluir_avaliacao", {
            p_profissional_id: session.idProfissional,
            p_avaliacao_id: avaliacaoId,
          });
          if (error) throw new Error(error.message);
          return { id: avaliacaoId };
        }

        if (action === "abrir_comanda") {
          const { data: createdId, error } = await rpc("app_profissional_abrir_comanda", {
            p_profissional_id: session.idProfissional,
            p_cliente_id: text(body.clienteId, 64) || null,
            p_cliente_nome: text(body.clienteNome, 160) || "Consumidor Final",
          });
          if (error) throw new Error(error.message);
          return { id: createdId };
        }

        if (action === "adicionar_item_comanda") {
          const comandaId = text(body.comandaId, 64);
          const nome = text(body.nome, 180);
          const quantidade = nonNegativeNumber(body.quantidade);
          const valorUnitario = nonNegativeNumber(body.valorUnitario);
          if (!comandaId || !nome || !Number.isFinite(quantidade) || quantidade <= 0 || !Number.isFinite(valorUnitario)) {
            throw new Error("Item da comanda inválido.");
          }
          const { error } = await rpc("app_profissional_adicionar_item_comanda", {
            p_profissional_id: session.idProfissional,
            p_comanda_id: comandaId,
            p_servico_id: text(body.servicoId, 64) || null,
            p_nome: nome,
            p_quantidade: quantidade,
            p_valor_unitario: valorUnitario,
            p_tipo: body.tipo === "produto" ? "produto" : "servico",
          });
          if (error) throw new Error(error.message);
          return { id: comandaId };
        }

        if (action === "fechar_comanda") {
          const comandaId = text(body.comandaId, 64);
          if (!comandaId) throw new Error("Comanda inválida.");
          const { error } = await rpc("app_profissional_fechar_comanda", {
            p_profissional_id: session.idProfissional,
            p_comanda_id: comandaId,
          });
          if (error) throw new Error(error.message);
          return { id: comandaId };
        }

        throw new Error("Ação do App Profissional não reconhecida.");
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Não foi possível concluir a operação.",
      },
      { status: 400 }
    );
  }
}
