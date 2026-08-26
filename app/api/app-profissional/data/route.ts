import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/db/admin-ops";
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

    const [notificacoes, payload] = await Promise.all([
      listProfissionalAppNotifications(session),
      runAdminOperation({
        action: "app_profissional_pwa_dados",
        actorId: session.idProfissional,
        idSalao: session.idSalao,
        run: async (database) => {
          const profissionaisQuery = database
            .from("profissionais")
            .select(
              "id, nome, nome_exibicao, dias_trabalho, ativo, tipo_profissional, sinal_confirmacao_responsavel"
            )
            .eq("id_salao", session.idSalao)
            .eq("ativo", true)
            .order("nome");
          const profissionaisResult = verTodos
            ? await profissionaisQuery
            : await profissionaisQuery.eq("id", session.idProfissional);
          if (profissionaisResult.error) {
            throw new Error(profissionaisResult.error.message);
          }

          const professionalRows = (profissionaisResult.data || []).filter(
            (item: any) =>
              String(item.tipo_profissional || "profissional").toLowerCase() !==
              "assistente"
          ) as Array<Record<string, any>>;
          const professionalIds = professionalRows
            .map((item) => String(item.id || ""))
            .filter(Boolean);
          const scopedAppointments = (query: any) =>
            verTodos
              ? query.in("profissional_id", professionalIds)
              : query.eq("profissional_id", session.idProfissional);
          const scopedServices = (query: any) =>
            verTodos
              ? query.in("id_profissional", professionalIds)
              : query.eq("id_profissional", session.idProfissional);

          const [agendamentosResult, bloqueiosResult, clientesResult, servicosResult] =
            await Promise.all([
              scopedAppointments(
                database
                  .from("agendamentos")
                  .select(
                    "id, profissional_id, cliente_id, servico_id, data, hora_inicio, hora_fim, status, created_at, origem, cliente_confirmacao_status, cliente_confirmou_em, observacoes, id_comanda, sinal_status, sinal_valor, sinal_confirmacao_responsavel, sinal_comprovante_path, sinal_comprovante_nome, sinal_comprovante_tipo"
                  )
                  .eq("id_salao", session.idSalao)
                  .gte("data", inicio)
                  .lte("data", fim)
                  .order("data")
                  .order("hora_inicio")
                  .limit(1000)
              ),
              scopedAppointments(
                database
                  .from("agenda_bloqueios")
                  .select("id, profissional_id, data, hora_inicio, hora_fim, motivo")
                  .eq("id_salao", session.idSalao)
                  .gte("data", inicio)
                  .lte("data", fim)
                  .order("data")
                  .order("hora_inicio")
                  .limit(1000)
              ),
              database
                .from("clientes")
                .select("id, nome, telefone, whatsapp, observacoes, created_at")
                .eq("id_salao", session.idSalao)
                .is("deleted_at", null)
                .order("nome")
                .limit(2000),
              scopedServices(
                database
                  .from("profissional_servicos")
                  .select(
                    "id_profissional, id_servico, duracao_minutos, preco_personalizado, ativo, servicos(id, nome, descricao, preco, preco_padrao, duracao_minutos, duracao, ativo)"
                  )
                  .eq("ativo", true)
                  .limit(1000)
              ),
            ]);

          for (const result of [
            agendamentosResult,
            bloqueiosResult,
            clientesResult,
            servicosResult,
          ]) {
            if (result.error) throw new Error(result.error.message);
          }

          const appointmentRows = (agendamentosResult.data || []) as Array<
            Record<string, any>
          >;
          const professionalRowsById = new Map(
            professionalRows.map((item) => [String(item.id), item])
          );
          const clientRows = (clientesResult.data || []) as Array<Record<string, any>>;
          const clientsById = new Map(
            clientRows.map((item) => [String(item.id), item])
          );
          const appointmentClientIds = Array.from(
            new Set(
              appointmentRows
                .map((item) => String(item.cliente_id || "").trim())
                .filter(Boolean)
            )
          );
          const auditByAppointmentId = new Map<string, Record<string, any>>();

          if (appointmentClientIds.length) {
            const auditResult = await database
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

            if (!auditResult.error) {
              for (const row of auditResult.data || []) {
                const metadata =
                  row?.metadata &&
                  typeof row.metadata === "object" &&
                  !Array.isArray(row.metadata)
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
              console.warn("[AGENDAMENTO_AUDIT_READ_ERROR]", auditResult.error.message);
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
                  link.preco_personalizado ??
                    service?.preco ??
                    service?.preco_padrao ??
                    0
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

          return {
            agendamentos: appointmentRows.map((item: any) => {
              const audit = auditByAppointmentId.get(String(item.id));
              const origem = normalizeOrigin(audit?.origem || item.origem);
              const cliente = item.cliente_id
                ? clientsById.get(String(item.cliente_id)) || null
                : null;
              const profissional = professionalRowsById.get(
                String(item.profissional_id)
              );

              let agendadoPorNome = String(audit?.ator_nome || "").trim() || null;
              let agendadoPorTipo = String(audit?.ator_tipo || "").trim() || null;

              if (!agendadoPorNome && origem === "app_cliente") {
                agendadoPorNome = String(cliente?.nome || "").trim() || "Cliente";
                agendadoPorTipo = "cliente";
              } else if (!agendadoPorNome && origem === "app_profissional") {
                agendadoPorNome =
                  String(
                    profissional?.nome_exibicao || profissional?.nome || ""
                  ).trim() || "Profissional";
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
                  profissional?.sinal_confirmacao_responsavel ||
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
                professionalRowsById.get(String(item.profissional_id))
                  ?.nome_exibicao ||
                professionalRowsById.get(String(item.profissional_id))?.nome ||
                null,
            })),
            clientes: clientRows,
            servicos: links,
            profissionais: professionalRows.map((item) => ({
              id: item.id,
              nome: item.nome,
              nome_exibicao: item.nome_exibicao,
              horario_funcionamento: item.dias_trabalho || [],
            })),
          };
        },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        ...payload,
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
      },
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
