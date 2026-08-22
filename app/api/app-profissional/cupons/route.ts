import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import {
  assertCanMutatePlanFeature,
  assertCanUsePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

function text(value: unknown) { return String(value ?? "").trim(); }
function number(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function digits(value: unknown) { return text(value).replace(/\D/g, ""); }

export async function GET() {
  try {
    const context = await requireProfissionalAppContext();
    await assertCanUsePlanFeature(context.idSalao, "campanhas");
    const payload = await runAdminOperation({
      action: "app_profissional_listar_cupons",
      actorId: context.idProfissional,
      idSalao: context.idSalao,
      run: async (supabase) => {
        const { data: cupons, error } = await (supabase as any)
          .from("cupons_salao")
          .select("id,codigo,nome,descricao,tipo_desconto,valor_desconto,valido_de,valido_ate,limite_uso_total,limite_uso_cliente,ativo,status_campanha,origem,created_at")
          .eq("id_salao", context.idSalao)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        const ids = (cupons || []).map((item: any) => item.id);
        if (!ids.length) return { cupons: [] };
        const [{ data: convites }, { data: usos }] = await Promise.all([
          (supabase as any).from("cupom_salao_resgates").select("id_cupom,status").in("id_cupom", ids),
          (supabase as any).from("cupom_salao_usos").select("id_cupom,status").in("id_cupom", ids),
        ]);
        const stats = new Map<string, { enviados: number; resgatados: number; usados: number }>();
        for (const id of ids) stats.set(id, { enviados: 0, resgatados: 0, usados: 0 });
        for (const item of convites || []) {
          const s = stats.get(item.id_cupom); if (!s) continue;
          s.enviados += 1;
          if (["resgatado", "usado"].includes(String(item.status))) s.resgatados += 1;
        }
        for (const item of usos || []) { const s = stats.get(item.id_cupom); if (s) s.usados += 1; }
        return { cupons: (cupons || []).map((cupom: any) => ({ ...cupom, ...(stats.get(cupom.id) || {}) })) };
      },
    });
    return NextResponse.json({ ok: true, ...payload }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Não foi possível carregar os cupons." }, { status: error instanceof PlanAccessError ? error.status : 400 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireProfissionalAppContext();
    await assertCanMutatePlanFeature(context.idSalao, "campanhas");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const nome = text(body.nome);
    const descricao = text(body.descricao);
    const tipoDesconto = text(body.tipoDesconto) === "valor_fixo" ? "valor_fixo" : "percentual";
    const valorDesconto = number(body.valorDesconto);
    const validoAte = text(body.validoAte) || null;
    const limiteTotal = Math.max(1, Math.trunc(number(body.limiteTotal, 1)));
    const clienteIds = Array.from(new Set(Array.isArray(body.clienteIds) ? body.clienteIds.map(text).filter(Boolean) : []));
    if (!nome) throw new Error("Informe o nome do cupom.");
    if (valorDesconto <= 0) throw new Error("Informe um desconto maior que zero.");
    if (tipoDesconto === "percentual" && valorDesconto > 100) throw new Error("O desconto percentual não pode passar de 100%.");
    if (!validoAte) throw new Error("Informe a validade do cupom.");
    if (validoAte < new Date().toISOString().slice(0, 10)) throw new Error("A validade não pode estar no passado.");
    if (!clienteIds.length) throw new Error("Selecione pelo menos uma cliente com WhatsApp.");

    const result = await runAdminOperation({
      action: "app_profissional_criar_cupom_privado",
      actorId: context.idProfissional,
      idSalao: context.idSalao,
      run: async (supabase) => {
        const { data: clientes, error: clientesError } = await (supabase as any)
          .from("clientes")
          .select("id,nome,telefone,whatsapp")
          .eq("id_salao", context.idSalao)
          .is("deleted_at", null)
          .in("id", clienteIds);
        if (clientesError) throw clientesError;
        const validas = (clientes || []).filter((c: any) => digits(c.whatsapp || c.telefone).length >= 10);
        if (!validas.length) throw new Error("Nenhuma cliente selecionada possui WhatsApp válido.");

        const codigo = `SP${Date.now().toString(36).toUpperCase()}`;
        const { data: cupom, error: cupomError } = await (supabase as any)
          .from("cupons_salao")
          .insert({
            id_salao: context.idSalao,
            codigo,
            nome,
            descricao: descricao || null,
            tipo_desconto: tipoDesconto,
            valor_desconto: valorDesconto,
            limite_uso_total: limiteTotal,
            limite_uso_cliente: 1,
            valido_de: new Date().toISOString().slice(0, 10),
            valido_ate: validoAte,
            ativo: true,
            requer_resgate: true,
            publico_alvo: "manual",
            publico_tipo: "link_privado",
            origem: "app_profissional",
            status_campanha: "ativa",
            mensagem_cliente: text(body.mensagem) || null,
            metadata: { privado_por_destinatario: true, criado_por_profissional: context.idProfissional },
          })
          .select("id,codigo,nome,valido_ate")
          .single();
        if (cupomError || !cupom?.id) throw cupomError || new Error("Não foi possível criar o cupom.");

        const convites = validas.map((cliente: any) => ({
          id_salao: context.idSalao,
          id_cupom: cupom.id,
          id_cliente: cliente.id,
          token: randomUUID().replace(/-/g, ""),
          status: "enviado",
          metadata: { origem: "app_profissional_whatsapp", profissional_id: context.idProfissional },
        }));
        const { data: convitesCriados, error: conviteError } = await (supabase as any)
          .from("cupom_salao_resgates")
          .insert(convites)
          .select("id_cliente,token,status");
        if (conviteError) throw conviteError;
        const tokenByCliente = new Map((convitesCriados || []).map((item: any) => [item.id_cliente, item.token]));
        return {
          cupom,
          destinatarios: validas.map((cliente: any) => ({
            id: cliente.id,
            nome: cliente.nome,
            whatsapp: digits(cliente.whatsapp || cliente.telefone),
            token: tokenByCliente.get(cliente.id),
          })),
        };
      },
    });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Não foi possível criar o cupom." }, { status: error instanceof PlanAccessError ? error.status : 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireProfissionalAppContext();
    await assertCanMutatePlanFeature(context.idSalao, "campanhas");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = text(body.id);
    const ativo = body.ativo === true;
    if (!id) throw new Error("Cupom não informado.");

    await runAdminOperation({
      action: ativo ? "app_profissional_ativar_cupom" : "app_profissional_desativar_cupom",
      actorId: context.idProfissional,
      idSalao: context.idSalao,
      run: async (supabase) => {
        const { data, error } = await (supabase as any)
          .from("cupons_salao")
          .update({ ativo, status_campanha: ativo ? "ativa" : "pausada", updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("id_salao", context.idSalao)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data?.id) throw new Error("Cupom não encontrado.");
      },
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Não foi possível alterar o cupom." }, { status: error instanceof PlanAccessError ? error.status : 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireProfissionalAppContext();
    await assertCanMutatePlanFeature(context.idSalao, "campanhas");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = text(body.id);
    if (!id) throw new Error("Cupom não informado.");

    await runAdminOperation({
      action: "app_profissional_excluir_cupom",
      actorId: context.idProfissional,
      idSalao: context.idSalao,
      run: async (supabase) => {
        const { data, error } = await (supabase as any)
          .from("cupons_salao")
          .delete()
          .eq("id", id)
          .eq("id_salao", context.idSalao)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data?.id) throw new Error("Cupom não encontrado.");
      },
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Não foi possível excluir o cupom." }, { status: error instanceof PlanAccessError ? error.status : 400 });
  }
}
