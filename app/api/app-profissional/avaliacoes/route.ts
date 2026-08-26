import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/db/admin-ops";

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const url = new URL(request.url);
    const now = new Date();
    const fallbackStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      .toISOString()
      .slice(0, 10);
    const fallbackEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const startParam = String(url.searchParams.get("start") || "");
    const endParam = String(url.searchParams.get("end") || "");
    const start = validDate(startParam) ? startParam : fallbackStart;
    const end = validDate(endParam) ? endParam : fallbackEnd;

    const payload = await runAdminOperation({
      action: "app_profissional_pwa_avaliacoes",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (database) => {
        let appointmentQuery = (database as any)
          .from("agendamentos")
          .select("id, profissional_id, cliente_id, servico_id")
          .eq("id_salao", session.idSalao)
          .gte("data", start)
          .lte("data", end)
          .limit(1000);
        if (!session.podeVerAgendaTodos) {
          appointmentQuery = appointmentQuery.eq("profissional_id", session.idProfissional);
        }

        const appointmentResult = await appointmentQuery;
        if (appointmentResult.error) throw new Error(appointmentResult.error.message);
        const appointments = (appointmentResult.data || []) as Array<Record<string, any>>;
        const appointmentIds = appointments.map((item) => String(item.id)).filter(Boolean);
        if (!appointmentIds.length) return { avaliacoes: [] };

        const clientIds = Array.from(
          new Set(appointments.map((item) => String(item.cliente_id || "")).filter(Boolean))
        );
        const serviceIds = Array.from(
          new Set(appointments.map((item) => String(item.servico_id || "")).filter(Boolean))
        );
        const professionalIds = Array.from(
          new Set(appointments.map((item) => String(item.profissional_id || "")).filter(Boolean))
        );

        const [evaluationResult, clientsResult, servicesResult, professionalsResult] = await Promise.all([
          (database as any)
            .from("clientes_avaliacoes")
            .select("id, id_cliente, id_agendamento, nota, comentario, created_at")
            .eq("id_salao", session.idSalao)
            .in("id_agendamento", appointmentIds)
            .order("created_at", { ascending: false })
            .limit(500),
          clientIds.length
            ? (database as any).from("clientes").select("id, nome").eq("id_salao", session.idSalao).in("id", clientIds)
            : Promise.resolve({ data: [], error: null }),
          serviceIds.length
            ? (database as any).from("servicos").select("id, nome").eq("id_salao", session.idSalao).in("id", serviceIds)
            : Promise.resolve({ data: [], error: null }),
          professionalIds.length
            ? (database as any).from("profissionais").select("id, nome, nome_exibicao").eq("id_salao", session.idSalao).in("id", professionalIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        for (const result of [evaluationResult, clientsResult, servicesResult, professionalsResult]) {
          if (result.error) throw new Error(result.error.message);
        }

        const appointmentsById = new Map(appointments.map((item) => [String(item.id), item]));
        const clientsById = new Map((clientsResult.data || []).map((item: any) => [String(item.id), item]));
        const servicesById = new Map((servicesResult.data || []).map((item: any) => [String(item.id), item]));
        const professionalsById = new Map((professionalsResult.data || []).map((item: any) => [String(item.id), item]));

        return {
          avaliacoes: (evaluationResult.data || []).map((item: any) => {
            const appointment = appointmentsById.get(String(item.id_agendamento)) as any;
            const professionalId = String(appointment?.profissional_id || session.idProfissional);
            const professional = professionalsById.get(professionalId) as any;
            const service = servicesById.get(String(appointment?.servico_id || "")) as any;
            const client = clientsById.get(String(item.id_cliente || appointment?.cliente_id || "")) as any;
            return {
              id: item.id,
              nota: Number(item.nota || 0),
              comentario: item.comentario || null,
              created_at: item.created_at || null,
              cliente_nome: client?.nome || "Cliente",
              servico_nome: service?.nome || "Serviço",
              profissional_id: professionalId,
              profissional_nome: professional?.nome_exibicao || professional?.nome || "Profissional",
            };
          }),
        };
      },
    });

    return NextResponse.json(
      { ok: true, ...payload },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível carregar as avaliações." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}
