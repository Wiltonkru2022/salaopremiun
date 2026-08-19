import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

export async function GET() {
  try {
    const session = await requireProfissionalAppContext();
    const payload = await runAdminOperation({
      action: "app_profissional_comandas_listar",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const comandaIds = new Set<string>();

        if (!session.podeVerAgendaTodos) {
          const [itensOwn, agendamentosOwn] = await Promise.all([
            (supabase as any)
              .from("comanda_itens")
              .select("id_comanda")
              .eq("id_salao", session.idSalao)
              .eq("id_profissional", session.idProfissional)
              .eq("ativo", true)
              .limit(500),
            (supabase as any)
              .from("agendamentos")
              .select("id_comanda")
              .eq("id_salao", session.idSalao)
              .eq("profissional_id", session.idProfissional)
              .not("id_comanda", "is", null)
              .limit(500),
          ]);
          if (itensOwn.error) throw new Error(itensOwn.error.message);
          if (agendamentosOwn.error) throw new Error(agendamentosOwn.error.message);
          for (const row of [...(itensOwn.data || []), ...(agendamentosOwn.data || [])]) {
            if (row.id_comanda) comandaIds.add(String(row.id_comanda));
          }
        }

        let comandasQuery = (supabase as any)
          .from("comandas")
          .select("id, numero, id_cliente, status, subtotal, desconto, total, aberta_em, fechada_em, created_at")
          .eq("id_salao", session.idSalao)
          .order("aberta_em", { ascending: false })
          .limit(300);

        if (!session.podeVerAgendaTodos) {
          if (!comandaIds.size) return { comandas: [], itensComanda: [] };
          comandasQuery = comandasQuery.in("id", Array.from(comandaIds));
        }

        const { data: comandas, error: comandasError } = await comandasQuery;
        if (comandasError) throw new Error(comandasError.message);
        const commandRows = comandas || [];
        const ids = commandRows.map((row: any) => String(row.id)).filter(Boolean);
        if (!ids.length) return { comandas: [], itensComanda: [] };

        const clienteIds = Array.from(
          new Set(commandRows.map((row: any) => String(row.id_cliente || "")).filter(Boolean))
        );

        const [itensResult, clientesResult] = await Promise.all([
          (supabase as any)
            .from("comanda_itens")
            .select("id, id_comanda, id_servico, tipo_item, tipo, descricao, quantidade, valor_unitario, valor_total, id_profissional, ativo")
            .eq("id_salao", session.idSalao)
            .in("id_comanda", ids)
            .eq("ativo", true)
            .order("created_at", { ascending: true })
            .limit(1500),
          clienteIds.length
            ? (supabase as any)
                .from("clientes")
                .select("id, nome")
                .eq("id_salao", session.idSalao)
                .in("id", clienteIds)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (itensResult.error) throw new Error(itensResult.error.message);
        if (clientesResult.error) throw new Error(clientesResult.error.message);

        const clientes = new Map(
          (clientesResult.data || []).map((row: any) => [String(row.id), String(row.nome || "Cliente")])
        );

        return {
          comandas: commandRows.map((row: any) => ({
            id: String(row.id),
            numero: row.numero ?? null,
            profissional_id: session.idProfissional,
            cliente_id: row.id_cliente ? String(row.id_cliente) : null,
            cliente_nome: row.id_cliente
              ? clientes.get(String(row.id_cliente)) || "Cliente"
              : "Consumidor Final",
            status: String(row.status || "aberta"),
            subtotal: Number(row.subtotal || 0),
            desconto: Number(row.desconto || 0),
            total: Number(row.total || 0),
            aberta_em: row.aberta_em || row.created_at || new Date(0).toISOString(),
            fechada_em: row.fechada_em || null,
          })),
          itensComanda: (itensResult.data || []).map((row: any) => ({
            id: String(row.id),
            comanda_id: String(row.id_comanda),
            servico_id: row.id_servico ? String(row.id_servico) : null,
            tipo: String(row.tipo || row.tipo_item || "servico").toLowerCase() === "produto" ? "produto" : "servico",
            nome: String(row.descricao || "Item"),
            quantidade: Number(row.quantidade || 1),
            valor_unitario: Number(row.valor_unitario || 0),
            total: Number(row.valor_total || 0),
          })),
        };
      },
    });

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível carregar as comandas." },
      { status: 400 }
    );
  }
}
