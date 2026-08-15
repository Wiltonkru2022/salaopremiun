import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { listProfissionalAppNotifications } from "@/lib/profissional-app-notifications";

function isoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const url = new URL(request.url);
    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || "";
    const inicio = isoDate(start) ? start : new Date().toISOString().slice(0, 10);
    const fim = isoDate(end) ? end : new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
    const verTodos = session.podeVerAgendaTodos;
    const notificacoes = await listProfissionalAppNotifications(session);

    const payload = await runAdminOperation({
      action: "app_profissional_pwa_dados",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const profissionaisQuery = (supabase as any)
          .from("profissionais")
          .select("id, nome, nome_exibicao, dias_trabalho, ativo, tipo_profissional")
          .eq("id_salao", session.idSalao)
          .eq("ativo", true)
          .order("nome");
        const profissionaisResult = verTodos
          ? await profissionaisQuery
          : await profissionaisQuery.eq("id", session.idProfissional);
        if (profissionaisResult.error) throw new Error(profissionaisResult.error.message);

        const ids = (profissionaisResult.data || [])
          .filter((item: any) => String(item.tipo_profissional || "profissional").toLowerCase() !== "assistente")
          .map((item: any) => item.id);
        const scoped = (query: any) => verTodos ? query.in("profissional_id", ids) : query.eq("profissional_id", session.idProfissional);

        const [agendamentosResult, bloqueiosResult, clientesResult, servicosResult] = await Promise.all([
          scoped(supabase.from("agendamentos").select("id, profissional_id, cliente_id, servico_id, data, hora_inicio, hora_fim, status, created_at, cliente_confirmacao_status, cliente_confirmou_em, observacoes, id_comanda, sinal_status, sinal_valor, sinal_confirmacao_responsavel, sinal_comprovante_path, sinal_comprovante_nome, sinal_comprovante_tipo").eq("id_salao", session.idSalao).gte("data", inicio).lte("data", fim).order("data").order("hora_inicio")),
          scoped(supabase.from("agenda_bloqueios").select("id, profissional_id, data, hora_inicio, hora_fim, motivo").eq("id_salao", session.idSalao).gte("data", inicio).lte("data", fim).order("data").order("hora_inicio")),
          (supabase as any).from("clientes").select("id, nome, telefone, whatsapp, observacoes, created_at").eq("id_salao", session.idSalao).is("deleted_at", null).order("nome"),
          (supabase as any).from("profissional_servicos").select("id_profissional, id_servico, duracao_minutos, preco_personalizado, ativo, servicos(id, nome, descricao, preco, preco_padrao, duracao_minutos, duracao, ativo)").eq("id_salao", session.idSalao).eq("ativo", true),
        ]);
        for (const result of [agendamentosResult, bloqueiosResult, clientesResult, servicosResult]) {
          if (result.error) throw new Error(result.error.message);
        }

        const professionalRows = (profissionaisResult.data || []) as Array<Record<string, any>>;
        const appointmentRows = (agendamentosResult.data || []) as Array<Record<string, any>>;
        const professionalRowsById = new Map(professionalRows.map((item) => [String(item.id), item]));
        const serviceIds = Array.from(new Set(appointmentRows.map((item) => item.servico_id).filter(Boolean)));
        const clientRows = (clientesResult.data || []) as Array<Record<string, any>>;
        const clientsById = new Map(clientRows.map((item) => [String(item.id), item]));
        const links: Array<Record<string, any>> = (servicosResult.data || []).map((link: any) => {
          const service = Array.isArray(link.servicos) ? link.servicos[0] : link.servicos;
          return {
            id: service?.id || link.id_servico,
            profissional_id: link.id_profissional,
            nome: service?.nome || "Servico",
            descricao: service?.descricao || null,
            preco: Number(link.preco_personalizado ?? service?.preco ?? service?.preco_padrao ?? 0),
            duracao_minutos: Number(link.duracao_minutos ?? service?.duracao_minutos ?? service?.duracao ?? 30),
            ativo: link.ativo !== false && service?.ativo !== false,
          };
        }).filter((item: any) => serviceIds.length === 0 || serviceIds.includes(item.id) || verTodos);
        const servicesById = new Map(links.map((item: Record<string, any>) => [item.id, item]));

        return {
          agendamentos: (agendamentosResult.data || []).map((item: any) => ({
            ...item,
            hora_inicio: String(item.hora_inicio).slice(0, 5),
            hora_fim: String(item.hora_fim).slice(0, 5),
            profissional_nome: professionalRowsById.get(String(item.profissional_id))?.nome_exibicao || professionalRowsById.get(String(item.profissional_id))?.nome || null,
            clientes: item.cliente_id ? clientsById.get(item.cliente_id) || null : null,
            servicos: item.servico_id ? servicesById.get(item.servico_id) || null : null,
          })),
          bloqueios: (bloqueiosResult.data || []).map((item: any) => ({
            id: item.id,
            profissional_id: item.profissional_id,
            cliente_id: null,
            servico_id: null,
            data: item.data,
            hora_inicio: String(item.hora_inicio).slice(0, 5),
            hora_fim: String(item.hora_fim).slice(0, 5),
            status: "bloqueado",
            titulo: "Horario bloqueado",
            observacoes: item.motivo,
            profissional_nome: professionalRowsById.get(String(item.profissional_id))?.nome_exibicao || professionalRowsById.get(String(item.profissional_id))?.nome || null,
          })),
          clientes: clientRows,
          servicos: links,
          comandas: [],
          itensComanda: [],
          notificacoes: notificacoes.map((item) => ({
            id: item.id,
            profissional_id: session.idProfissional,
            titulo: item.title,
            mensagem: item.description,
            lida:
              item.read === true ||
              item.type === "senha_redefinida_salao",
            created_at: item.createdAt || new Date(0).toISOString(),
            url: item.href || null,
            tipo: item.type || null,
            status: item.status || null,
          })),
          comissoes: [],
          avaliacoes: [],
          profissionais: professionalRows.map((item) => ({
            id: item.id,
            nome: item.nome,
            nome_exibicao: item.nome_exibicao,
            horario_funcionamento: item.dias_trabalho || [],
          })),
        };
      },
    });

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nao foi possivel carregar a agenda." },
      { status: 401 }
    );
  }
}
