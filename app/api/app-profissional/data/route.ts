import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { listProfissionalAppNotifications } from "@/lib/profissional-app-notifications";

function isoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function firstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 30;
}

function normalizeOrigin(value: unknown) {
  const origem = String(value || "").trim().toLowerCase();
  if (origem === "app_cliente") return "app_cliente";
  if (origem === "app_profissional") return "app_profissional";
  if (origem === "painel" || origem === "manual") return "painel";
  return origem || null;
}

function extractProfessionalIdFromComanda(value: unknown) {
  const match = String(value || "").match(/profissional:([0-9a-f-]{36})/i);
  return match?.[1] || null;
}

function startOfDay(date: string) {
  return `${date}T00:00:00.000Z`;
}

function endOfDay(date: string) {
  return `${date}T23:59:59.999Z`;
}

export async function GET(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const url = new URL(request.url);
    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || "";
    const inicio = isoDate(start) ? start : new Date().toISOString().slice(0, 10);
    const fim = isoDate(end)
      ? end
      : new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const verTodos = session.podeVerAgendaTodos;
    const notificacoes = await listProfissionalAppNotifications(session);

    const payload = await runAdminOperation({
      action: "app_profissional_pwa_dados",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const profissionaisQuery = (supabase as any)
          .from("profissionais")
          .select("id, nome, nome_exibicao, dias_trabalho, ativo, tipo_profissional, sinal_confirmacao_responsavel")
          .eq("id_salao", session.idSalao)
          .eq("ativo", true)
          .order("nome");
        const profissionaisResult = verTodos
          ? await profissionaisQuery
          : await profissionaisQuery.eq("id", session.idProfissional);
        if (profissionaisResult.error) throw new Error(profissionaisResult.error.message);

        const professionalRows = (profissionaisResult.data || [])
          .filter(
            (item: any) =>
              String(item.tipo_profissional || "profissional").toLowerCase() !==
              "assistente"
          ) as Array<Record<string, any>>;
        const ids = professionalRows.map((item) => item.id).filter(Boolean);
        const scoped = (query: any) =>
          verTodos
            ? query.in("profissional_id", ids)
            : query.eq("profissional_id", session.idProfissional);
        const scopedServices = (query: any) =>
          verTodos
            ? query.in("id_profissional", ids)
            : query.eq("id_profissional", session.idProfissional);
        const scopedCommissions = (query: any) =>
          verTodos
            ? query.in("id_profissional", ids)
            : query.eq("id_profissional", session.idProfissional);

        const [
          agendamentosResult,
          bloqueiosResult,
          clientesResult,
          servicosResult,
          comandasResult,
          itensComandaResult,
          comissoesResult,
        ] = await Promise.all([
          scoped(
            supabase
              .from("agendamentos")
              .select("id, profissional_id, cliente_id, servico_id, data, hora_inicio, hora_fim, status, created_at, origem, cliente_confirmacao_status, cliente_confirmou_em, observacoes, id_comanda, sinal_status, sinal_valor, sinal_confirmacao_responsavel, sinal_comprovante_path, sinal_comprovante_nome, sinal_comprovante_tipo")
              .eq("id_salao", session.idSalao)
              .gte("data", inicio)
              .lte("data", fim)
              .order("data")
              .order("hora_inicio")
          ),
          scoped(
            supabase
              .from("agenda_bloqueios")
              .select("id, profissional_id, data, hora_inicio, hora_fim, motivo")
              .eq("id_salao", session.idSalao)
              .gte("data", inicio)
              .lte("data", fim)
              .order("data")
              .order("hora_inicio")
          ),
          (supabase as any)
            .from("clientes")
            .select("id, nome, telefone, whatsapp, observacoes, created_at")
            .eq("id_salao", session.idSalao)
            .is("deleted_at", null)
            .order("nome"),
          scopedServices(
            (supabase as any)
              .from("profissional_servicos")
              .select("id_profissional, id_servico, duracao_minutos, preco_personalizado, ativo, servicos(id, nome, descricao, preco, preco_padrao, duracao_minutos, duracao, ativo)")
              .eq("ativo", true)
          ),
          (supabase as any)
            .from("comandas")
            .select("id, numero, id_cliente, status, observacoes, subtotal, desconto, total, aberta_em, fechada_em")
            .eq("id_salao", session.idSalao)
            .gte("aberta_em", startOfDay(inicio))
            .lte("aberta_em", endOfDay(fim))
            .order("aberta_em", { ascending: false })
            .limit(500),
          (supabase as any)
            .from("comanda_itens")
            .select("id, id_comanda, id_servico, tipo_item, tipo, descricao, quantidade, valor_unitario, valor_total, id_profissional, created_at, ativo")
            .eq("id_salao", session.idSalao)
            .eq("ativo", true)
            .gte("created_at", startOfDay(inicio))
            .lte("created_at", endOfDay(fim))
            .order("created_at", { ascending: false })
            .limit(1000),
          scopedCommissions(
            (supabase as any)
              .from("comissoes_lancamentos")
              .select("id, id_profissional, descricao, valor_base, valor_comissao, percentual, percentual_aplicado, status, competencia, competencia_data, pago_em, criado_em")
              .eq("id_salao", session.idSalao)
              .gte("competencia_data", inicio)
              .lte("competencia_data", fim)
              .order("competencia_data", { ascending: false })
              .limit(1000)
          ),
        ]);

        for (const result of [
          agendamentosResult,
          bloqueiosResult,
          clientesResult,
          servicosResult,
          comandasResult,
          itensComandaResult,
          comissoesResult,
        ]) {
          if (result.error) throw new Error(result.error.message);
        }

        const appointmentRows = (agendamentosResult.data || []) as Array<Record<string, any>>;
        const professionalRowsById = new Map(
          professionalRows.map((item) => [String(item.id), item])
        );
        const clientRows = (clientesResult.data || []) as Array<Record<string, any>>;
        const clientsById = new Map(clientRows.map((item) => [String(item.id), item]));

        const appointmentClientIds = Array.from(
          new Set(
            appointmentRows
              .map((item) => String(item.cliente_id || "").trim())
              .filter(Boolean)
          )
        );
        const appointmentIds = appointmentRows
          .map((item) => String(item.id || "").trim())
          .filter(Boolean);
        const auditByAppointmentId = new Map<string, Record<string, any>>();

        if (appointmentClientIds.length) {
          try {
            const { data: auditRows, error: auditError } = await (supabase as any)
              .from("clientes_timeline")
              .select("id, id_cliente, metadata, created_at")
              .eq("id_salao", session.idSalao)
              .eq("tipo", "agendamento")
              .contains("metadata", { evento: "agendamento_criado" })
              .in("id_cliente", appointmentClientIds)
              .gte("created_at", startOfDay(inicio))
              .lte("created_at", endOfDay(fim))
              .order("created_at", { ascending: false })
              .limit(500);

            if (!auditError) {
              for (const row of auditRows || []) {
                const metadata =
                  row?.metadata && typeof row.metadata === "object"
                    ? (row.metadata as Record<string, any>)
                    : {};
                const agendamentoId = String(metadata.agendamento_id || "").trim();
                if (agendamentoId && !auditByAppointmentId.has(agendamentoId)) {
                  auditByAppointmentId.set(agendamentoId, {
                    ...metadata,
                    created_at: row.created_at || null,
                  });
                }
              }
            } else {
              console.warn("[AGENDAMENTO_AUDIT_READ_ERROR]", auditError.message);
            }
          } catch (auditError) {
            console.warn(
              "[AGENDAMENTO_AUDIT_READ_ERROR]",
              auditError instanceof Error ? auditError.message : "erro_desconhecido"
            );
          }
        }

        const links: Array<Record<string, any>> = (servicosResult.data || [])
          .map((link: any) => {
            const service = Array.isArray(link.servicos)
              ? link.servicos[0]
              : link.servicos;
            return {
              id: service?.id || link.id_servico,
              profissional_id: link.id_profissional,
              nome: service?.nome || "Serviço",
              descricao: service?.descricao || null,
              preco: Number(
                link.preco_personalizado ?? service?.preco ?? service?.preco_padrao ?? 0
              ),
              duracao_minutos: firstPositiveNumber(
                link.duracao_minutos,
                service?.duracao_minutos,
                service?.duracao,
                30
              ),
              ativo: link.ativo !== false && service?.ativo !== false,
            };
          })
          .filter((item: any) => item.ativo);
        const servicesByProfessionalAndId = new Map(
          links.map((item: Record<string, any>) => [
            `${String(item.profissional_id)}:${String(item.id)}`,
            item,
          ])
        );

        const itemRows = (itensComandaResult.data || []) as Array<Record<string, any>>;
        const itemRowsByComanda = new Map<string, Array<Record<string, any>>>();
        for (const item of itemRows) {
          const comandaId = String(item.id_comanda || "");
          if (!comandaId) continue;
          const current = itemRowsByComanda.get(comandaId) || [];
          current.push(item);
          itemRowsByComanda.set(comandaId, current);
        }

        const commandRows = ((comandasResult.data || []) as Array<Record<string, any>>).filter(
          (command) => {
            if (verTodos) return true;
            const creatorId = extractProfessionalIdFromComanda(command.observacoes);
            if (creatorId === session.idProfissional) return true;
            return (itemRowsByComanda.get(String(command.id)) || []).some(
              (item) => String(item.id_profissional || "") === session.idProfissional
            );
          }
        );
        const visibleCommandIds = new Set(commandRows.map((item) => String(item.id)));
        const visibleItemRows = itemRows.filter((item) =>
          visibleCommandIds.has(String(item.id_comanda))
        );

        let evaluationRows: Array<Record<string, any>> = [];
        if (appointmentIds.length) {
          const evaluationResult = await (supabase as any)
            .from("clientes_avaliacoes")
            .select("id, id_cliente, id_agendamento, nota, comentario, created_at")
            .eq("id_salao", session.idSalao)
            .in("id_agendamento", appointmentIds)
            .order("created_at", { ascending: false })
            .limit(500);
          if (evaluationResult.error) throw new Error(evaluationResult.error.message);
          evaluationRows = evaluationResult.data || [];
        }

        const appointmentsById = new Map(
          appointmentRows.map((item) => [String(item.id), item])
        );

        return {
          agendamentos: appointmentRows.map((item: any) => {
            const audit = auditByAppointmentId.get(String(item.id));
            const origem = normalizeOrigin(audit?.origem || item.origem);
            const cliente = item.cliente_id
              ? clientsById.get(String(item.cliente_id)) || null
              : null;
            const profissional = professionalRowsById.get(String(item.profissional_id));

            let agendadoPorNome = String(audit?.ator_nome || "").trim() || null;
            let agendadoPorTipo = String(audit?.ator_tipo || "").trim() || null;

            if (!agendadoPorNome && origem === "app_cliente") {
              agendadoPorNome = String(cliente?.nome || "").trim() || "Cliente";
              agendadoPorTipo = "cliente";
            } else if (!agendadoPorNome && origem === "app_profissional") {
              agendadoPorNome =
                String(profissional?.nome_exibicao || profissional?.nome || "").trim() ||
                "Profissional";
              agendadoPorTipo = "profissional";
            } else if (!agendadoPorNome && origem === "painel") {
              agendadoPorNome = "Equipe do salão";
              agendadoPorTipo = "painel";
            }

            return {
              ...item,
              origem,
              agendado_por_nome: agendadoPorNome,
              agendado_por_tipo: agendadoPorTipo,
              agendado_em: audit?.created_at || item.created_at || null,
              hora_inicio: String(item.hora_inicio).slice(0, 5),
              hora_fim: String(item.hora_fim).slice(0, 5),
              sinal_confirmacao_responsavel:
                item.sinal_confirmacao_responsavel ||
                professionalRowsById.get(String(item.profissional_id))
                  ?.sinal_confirmacao_responsavel ||
                "salao",
              profissional_nome:
                profissional?.nome_exibicao || profissional?.nome || null,
              clientes: cliente,
              servicos: item.servico_id
                ? servicesByProfessionalAndId.get(
                    `${String(item.profissional_id)}:${String(item.servico_id)}`
                  ) || null
                : null,
            };
          }),
          bloqueios: (bloqueiosResult.data || []).map((item: any) => ({
            id: item.id,
            profissional_id: item.profissional_id,
            cliente_id: null,
            servico_id: null,
            data: item.data,
            hora_inicio: String(item.hora_inicio).slice(0, 5),
            hora_fim: String(item.hora_fim).slice(0, 5),
            status: "bloqueado",
            titulo: "Horário bloqueado",
            observacoes: item.motivo,
            profissional_nome:
              professionalRowsById.get(String(item.profissional_id))?.nome_exibicao ||
              professionalRowsById.get(String(item.profissional_id))?.nome ||
              null,
          })),
          clientes: clientRows,
          servicos: links,
          comandas: commandRows.map((item) => {
            const commandItems = itemRowsByComanda.get(String(item.id)) || [];
            const profissionalId =
              extractProfessionalIdFromComanda(item.observacoes) ||
              String(commandItems[0]?.id_profissional || session.idProfissional);
            const client = item.id_cliente
              ? clientsById.get(String(item.id_cliente))
              : null;
            return {
              id: item.id,
              numero: item.numero,
              profissional_id: profissionalId,
              cliente_id: item.id_cliente || null,
              cliente_nome: client?.nome || "Consumidor Final",
              status: item.status,
              subtotal: Number(item.subtotal || 0),
              desconto: Number(item.desconto || 0),
              total: Number(item.total || 0),
              aberta_em: item.aberta_em,
              fechada_em: item.fechada_em || null,
            };
          }),
          itensComanda: visibleItemRows.map((item) => ({
            id: item.id,
            comanda_id: item.id_comanda,
            servico_id: item.id_servico || null,
            tipo: String(item.tipo || item.tipo_item || "servico").toLowerCase() === "produto"
              ? "produto"
              : "servico",
            nome: item.descricao || "Item",
            quantidade: Number(item.quantidade || 0),
            valor_unitario: Number(item.valor_unitario || 0),
            total: Number(item.valor_total || 0),
          })),
          notificacoes: notificacoes.map((item) => ({
            id: item.id,
            profissional_id: session.idProfissional,
            titulo: item.title,
            mensagem: item.description,
            lida: item.read === true || item.type === "senha_redefinida_salao",
            created_at: item.createdAt || new Date(0).toISOString(),
            url: item.href || null,
            tipo: item.type || null,
            status: item.status || null,
          })),
          comissoes: (comissoesResult.data || []).map((item: any) => ({
            id: item.id,
            descricao: item.descricao || "Comissão",
            competenciaData: item.competencia_data || item.competencia || null,
            valorBase: Number(item.valor_base || 0),
            valor: Number(item.valor_comissao || 0),
            percentualAplicado: Number(item.percentual_aplicado ?? item.percentual ?? 0),
            status: item.status || "pendente",
            pagoEm: item.pago_em || null,
          })),
          avaliacoes: evaluationRows.map((item) => {
            const appointment = appointmentsById.get(String(item.id_agendamento));
            const professionalId = String(appointment?.profissional_id || session.idProfissional);
            const professional = professionalRowsById.get(professionalId);
            const service = appointment?.servico_id
              ? servicesByProfessionalAndId.get(
                  `${professionalId}:${String(appointment.servico_id)}`
                )
              : null;
            const client = item.id_cliente
              ? clientsById.get(String(item.id_cliente))
              : null;
            return {
              id: item.id,
              nota: Number(item.nota || 0),
              comentario: item.comentario || null,
              created_at: item.created_at || null,
              cliente_nome: client?.nome || "Cliente",
              servico_nome: service?.nome || "Serviço",
              profissional_id: professionalId,
              profissional_nome:
                professional?.nome_exibicao || professional?.nome || "Profissional",
            };
          }),
          profissionais: professionalRows.map((item) => ({
            id: item.id,
            nome: item.nome,
            nome_exibicao: item.nome_exibicao,
            horario_funcionamento: item.dias_trabalho || [],
          })),
        };
      },
    });

    return NextResponse.json(
      { ok: true, ...payload },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados do profissional.",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}
