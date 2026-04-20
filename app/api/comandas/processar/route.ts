import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  adicionarItemComanda,
  COMANDA_ACTIONS,
  editarItemComanda,
  enviarComandaParaPagamento,
  isComandaAction,
  processarCriacaoPorAgendamento,
  removerItemComanda,
  resolveComandaHttpStatus,
  salvarBaseComanda,
  sanitizeIdempotencyKey,
  sanitizeUuid,
} from "@/lib/comandas/processar";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { registrarLogSistema } from "@/lib/system-logs";
import type { ProcessarComandaBody } from "@/types/comandas";

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acao = "";

  try {
    const body = (await req.json()) as ProcessarComandaBody;
    idSalao = sanitizeUuid(body.idSalao) || "";
    acao = String(body.acao || "").trim().toLowerCase();
    const idempotencyKey = sanitizeIdempotencyKey(body.idempotencyKey);

    if (!idSalao) {
      return NextResponse.json({ error: "Salao obrigatorio." }, { status: 400 });
    }

    if (!isComandaAction(acao)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const permissionMembership = await requireSalaoPermission(
      idSalao,
      "comandas_ver"
    );
    await assertCanMutatePlanFeature(idSalao, "comandas");

    const supabaseAdmin = getSupabaseAdmin();
    const comanda = body.comanda || {};
    const item = body.item || {};

    if (acao === "criar_por_agendamento") {
      const idAgendamento = sanitizeUuid(item.id_agendamento);

      if (!idAgendamento) {
        return NextResponse.json(
          { error: "Agendamento obrigatorio para abrir no caixa." },
          { status: 400 }
        );
      }

      try {
        const data = await processarCriacaoPorAgendamento({
          supabaseAdmin,
          idSalao,
          idAgendamento,
        });

        await registrarLogSistema({
          gravidade: data.jaExistia ? "warning" : "info",
          modulo: "comandas",
          idSalao,
          idUsuario: permissionMembership.usuario.id,
          mensagem: data.jaExistia
            ? "Comanda de agendamento reaproveitada por idempotencia."
            : "Comanda criada a partir de agendamento.",
          detalhes: {
            acao,
            id_agendamento: idAgendamento,
            id_comanda: data.idComanda,
            ja_existia: data.jaExistia,
          },
        });

        return NextResponse.json({
          ok: true,
          idComanda: data.idComanda,
          jaExistia: data.jaExistia,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Erro ao abrir agendamento no caixa.",
          },
          {
            status:
              error instanceof Error && error.message.includes("nao encontrado")
                ? 404
                : resolveComandaHttpStatus(error),
          }
        );
      }
    }

    if (acao === "salvar_base") {
      try {
        const data = await salvarBaseComanda({
          supabaseAdmin,
          idSalao,
          comanda,
        });

        await registrarLogSistema({
          gravidade: "info",
          modulo: "comandas",
          idSalao,
          idUsuario: permissionMembership.usuario.id,
          mensagem: "Base da comanda salva pelo servidor.",
          detalhes: {
            acao,
            id_comanda: data.idComanda,
            numero: data.numero,
            status: data.status,
          },
        });

        return NextResponse.json({ ok: true, idComanda: data.idComanda });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Erro ao salvar comanda.",
          },
          {
            status:
              error instanceof Error && error.message.includes("Numero")
                ? 400
                : resolveComandaHttpStatus(error),
          }
        );
      }
    }

    if (acao === "adicionar_item" || acao === "editar_item") {
      try {
        if (acao === "adicionar_item") {
          const data = await adicionarItemComanda({
            supabaseAdmin,
            idSalao,
            comanda,
            item,
            idempotencyKey,
          });

          await registrarLogSistema({
            gravidade: data.idempotentReplay ? "warning" : "info",
            modulo: "comandas",
            idSalao,
            idUsuario: permissionMembership.usuario.id,
            mensagem: data.idempotentReplay
              ? "Item de comanda reaproveitado por idempotencia."
              : "Item adicionado na comanda pelo servidor.",
            detalhes: {
              acao,
              id_comanda: data.idComanda,
              id_item: data.idItem || null,
              tipo_item: data.resolved.tipoItem,
              idempotency_key: data.idempotencyKey,
              ja_existia: data.idempotentReplay,
            },
          });

          return NextResponse.json({
            ok: true,
            idComanda: data.idComanda,
            idItem: data.idItem,
            idempotentReplay: data.idempotentReplay,
          });
        }

        const data = await editarItemComanda({
          supabaseAdmin,
          idSalao,
          comanda,
          item,
        });

        await registrarLogSistema({
          gravidade: "info",
          modulo: "comandas",
          idSalao,
          idUsuario: permissionMembership.usuario.id,
          mensagem: "Item da comanda atualizado pelo servidor.",
          detalhes: {
            acao,
            id_comanda: data.idComanda,
            id_item: data.idItem,
            tipo_item: data.resolved.tipoItem,
          },
        });

        return NextResponse.json({
          ok: true,
          idComanda: data.idComanda,
          idItem: data.idItem,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Erro ao validar item da comanda.",
          },
          {
            status:
              error instanceof Error &&
              (error.message.includes("obrigatoria") ||
                error.message.includes("obrigatorio") ||
                error.message.includes("nao encontrado") ||
                error.message.includes("Selecione") ||
                error.message.includes("vinculado"))
                ? 400
                : resolveComandaHttpStatus(error),
          }
        );
      }
    }

    if (acao === "remover_item") {
      try {
        const data = await removerItemComanda({
          supabaseAdmin,
          idSalao,
          comanda,
          item,
        });

        await registrarLogSistema({
          gravidade: "warning",
          modulo: "comandas",
          idSalao,
          idUsuario: permissionMembership.usuario.id,
          mensagem: "Item removido da comanda pelo servidor.",
          detalhes: {
            acao,
            id_comanda: data.idComanda,
            id_item: data.idItem,
          },
        });

        return NextResponse.json({ ok: true, idComanda: data.idComanda });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Erro ao remover item.",
          },
          {
            status:
              error instanceof Error && error.message.includes("obrigatorios")
                ? 400
                : resolveComandaHttpStatus(error),
          }
        );
      }
    }

    const data = await enviarComandaParaPagamento({
      supabaseAdmin,
      idSalao,
      comanda,
    });

    await registrarLogSistema({
      gravidade: "info",
      modulo: "comandas",
      idSalao,
      idUsuario: permissionMembership.usuario.id,
      mensagem: "Comanda enviada para pagamento pelo servidor.",
      detalhes: {
        acao,
        id_comanda: data.idComanda,
        status: data.status,
      },
    });

    return NextResponse.json({
      ok: true,
      idComanda: data.idComanda,
      status: data.status,
    });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof PlanAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `comandas:processar:${acao || "desconhecida"}:${idSalao}`,
          module: "comandas",
          title: "Processamento de comanda falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao processar comanda.",
          severity: "alta",
          idSalao,
          details: {
            acao: isComandaAction(acao) ? acao : null,
            route: "/api/comandas/processar",
            acoes_suportadas: COMANDA_ACTIONS,
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de comandas:",
          incidentError
        );
      }
    }

    console.error("Erro geral ao processar comanda:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar comanda." },
      { status: resolveComandaHttpStatus(error) }
    );
  }
}
