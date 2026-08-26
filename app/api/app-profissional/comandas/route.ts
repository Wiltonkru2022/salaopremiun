import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/db/admin-ops";

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateRange(request: Request) {
  const url = new URL(request.url);
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    .toISOString()
    .slice(0, 10);
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0)
    .toISOString()
    .slice(0, 10);
  const start = String(url.searchParams.get("start") || "");
  const end = String(url.searchParams.get("end") || "");
  return {
    start: validDate(start) ? start : defaultStart,
    end: validDate(end) ? end : defaultEnd,
  };
}

function extractProfessionalId(value: unknown) {
  return String(value || "").match(/profissional:([0-9a-f-]{36})/i)?.[1] || null;
}

export async function GET(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const range = dateRange(request);

    const payload = await runAdminOperation({
      action: "app_profissional_pwa_comandas",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (database) => {
        const startIso = `${range.start}T00:00:00.000Z`;
        const endIso = `${range.end}T23:59:59.999Z`;

        const [commandResult, ownItemsResult, clientsResult] = await Promise.all([
          (database as any)
            .from("comandas")
            .select("id, numero, id_cliente, status, observacoes, subtotal, desconto, total, aberta_em, fechada_em")
            .eq("id_salao", session.idSalao)
            .gte("aberta_em", startIso)
            .lte("aberta_em", endIso)
            .order("aberta_em", { ascending: false })
            .limit(500),
          session.podeVerAgendaTodos
            ? Promise.resolve({ data: [], error: null })
            : (database as any)
                .from("comanda_itens")
                .select("id_comanda")
                .eq("id_salao", session.idSalao)
                .eq("id_profissional", session.idProfissional)
                .eq("ativo", true)
                .gte("created_at", startIso)
                .lte("created_at", endIso)
                .limit(1000),
          (database as any)
            .from("clientes")
            .select("id, nome")
            .eq("id_salao", session.idSalao)
            .is("deleted_at", null),
        ]);

        for (const result of [commandResult, ownItemsResult, clientsResult]) {
          if (result.error) throw new Error(result.error.message);
        }

        const ownCommandIds = new Set(
          (ownItemsResult.data || []).map((item: any) => String(item.id_comanda || ""))
        );
        const commands = ((commandResult.data || []) as Array<Record<string, any>>).filter(
          (command) =>
            session.podeVerAgendaTodos ||
            extractProfessionalId(command.observacoes) === session.idProfissional ||
            ownCommandIds.has(String(command.id))
        );
        const commandIds = commands.map((item) => String(item.id)).filter(Boolean);
        const clientsById = new Map(
          (clientsResult.data || []).map((item: any) => [String(item.id), item])
        );

        let items: Array<Record<string, any>> = [];
        if (commandIds.length) {
          const itemsResult = await (database as any)
            .from("comanda_itens")
            .select("id, id_comanda, id_servico, tipo_item, tipo, descricao, quantidade, valor_unitario, valor_total, id_profissional, ativo")
            .eq("id_salao", session.idSalao)
            .eq("ativo", true)
            .in("id_comanda", commandIds)
            .limit(1500);
          if (itemsResult.error) throw new Error(itemsResult.error.message);
          items = itemsResult.data || [];
        }

        const firstProfessionalByCommand = new Map<string, string>();
        for (const item of items) {
          const commandId = String(item.id_comanda || "");
          const professionalId = String(item.id_profissional || "");
          if (commandId && professionalId && !firstProfessionalByCommand.has(commandId)) {
            firstProfessionalByCommand.set(commandId, professionalId);
          }
        }

        return {
          comandas: commands.map((item) => {
            const client = item.id_cliente
              ? clientsById.get(String(item.id_cliente)) as any
              : null;
            return {
              id: item.id,
              numero: item.numero,
              profissional_id:
                extractProfessionalId(item.observacoes) ||
                firstProfessionalByCommand.get(String(item.id)) ||
                session.idProfissional,
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
          itensComanda: items.map((item) => ({
            id: item.id,
            comanda_id: item.id_comanda,
            servico_id: item.id_servico || null,
            tipo:
              String(item.tipo || item.tipo_item || "servico").toLowerCase() === "produto"
                ? "produto"
                : "servico",
            nome: item.descricao || "Item",
            quantidade: Number(item.quantidade || 0),
            valor_unitario: Number(item.valor_unitario || 0),
            total: Number(item.valor_total || 0),
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
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível carregar as comandas." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}
