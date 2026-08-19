import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

export async function GET() {
  try {
    const session = await requireProfissionalAppContext();
    const payload = await runAdminOperation({
      action: "app_profissional_avaliacoes_listar",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { data: appointments, error: appointmentsError } = await (supabase as any)
          .from("agendamentos")
          .select("id, cliente_id, servico_id, profissional_id")
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", session.idProfissional)
          .limit(1000);
        if (appointmentsError) throw new Error(appointmentsError.message);

        const appointmentRows = appointments || [];
        const appointmentIds = appointmentRows.map((row: any) => String(row.id)).filter(Boolean);
        if (!appointmentIds.length) return { avaliacoes: [] };

        const { data: reviews, error: reviewsError } = await (supabase as any)
          .from("clientes_avaliacoes")
          .select("id, id_cliente, id_agendamento, nota, comentario, created_at")
          .eq("id_salao", session.idSalao)
          .in("id_agendamento", appointmentIds)
          .order("created_at", { ascending: false })
          .limit(500);
        if (reviewsError) throw new Error(reviewsError.message);
        if (!(reviews || []).length) return { avaliacoes: [] };

        const appointmentById = new Map(
          appointmentRows.map((row: any) => [String(row.id), row])
        );
        const clientIds = Array.from(
          new Set((reviews || []).map((row: any) => String(row.id_cliente || "")).filter(Boolean))
        );
        const serviceIds = Array.from(
          new Set(
            appointmentRows.map((row: any) => String(row.servico_id || "")).filter(Boolean)
          )
        );

        const [clientsResult, servicesResult, professionalResult] = await Promise.all([
          clientIds.length
            ? (supabase as any)
                .from("clientes")
                .select("id, nome")
                .eq("id_salao", session.idSalao)
                .in("id", clientIds)
            : Promise.resolve({ data: [], error: null }),
          serviceIds.length
            ? (supabase as any)
                .from("servicos")
                .select("id, nome")
                .eq("id_salao", session.idSalao)
                .in("id", serviceIds)
            : Promise.resolve({ data: [], error: null }),
          (supabase as any)
            .from("profissionais")
            .select("id, nome, nome_exibicao")
            .eq("id", session.idProfissional)
            .eq("id_salao", session.idSalao)
            .maybeSingle(),
        ]);
        if (clientsResult.error) throw new Error(clientsResult.error.message);
        if (servicesResult.error) throw new Error(servicesResult.error.message);
        if (professionalResult.error) throw new Error(professionalResult.error.message);

        const clients = new Map(
          (clientsResult.data || []).map((row: any) => [String(row.id), String(row.nome || "Cliente")])
        );
        const services = new Map(
          (servicesResult.data || []).map((row: any) => [String(row.id), String(row.nome || "Serviço")])
        );
        const professionalName =
          String(professionalResult.data?.nome_exibicao || professionalResult.data?.nome || "Profissional");

        return {
          avaliacoes: (reviews || []).map((row: any) => {
            const appointment = appointmentById.get(String(row.id_agendamento)) || {};
            return {
              id: String(row.id),
              nota: Number(row.nota || 0),
              comentario: row.comentario ? String(row.comentario) : null,
              created_at: row.created_at || null,
              cliente_nome: row.id_cliente
                ? clients.get(String(row.id_cliente)) || "Cliente"
                : "Cliente",
              servico_nome: appointment.servico_id
                ? services.get(String(appointment.servico_id)) || "Serviço"
                : "Serviço",
              profissional_id: session.idProfissional,
              profissional_nome: professionalName,
            };
          }),
        };
      },
    });

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível carregar as avaliações." },
      { status: 400 }
    );
  }
}
