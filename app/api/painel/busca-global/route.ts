import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchResult = {
  id: string;
  type: "cliente" | "agendamento" | "comanda" | "servico";
  title: string;
  description: string;
  href: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeSearchTerm(value: string | null) {
  return String(value || "")
    .replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function relatedName(value: unknown) {
  if (Array.isArray(value)) {
    return relatedName(value[0]);
  }

  if (value && typeof value === "object" && "nome" in value) {
    return String((value as { nome?: unknown }).nome || "");
  }

  return "";
}

function formatCurrency(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: unknown) {
  if (!value) return "";
  const raw = String(value);
  const [year, month, day] = raw.split("-");
  if (!year || !month || !day) return raw;
  return `${day}/${month}/${year}`;
}

export async function GET(request: Request) {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    return jsonError("Sessão expirada.", 401);
  }

  if (!usuario?.id_salao) {
    return jsonError("Não foi possível identificar o salão do usuário.", 403);
  }

  if (usuario.status !== "ativo") {
    return jsonError("Usuário inativo.", 403);
  }

  const url = new URL(request.url);
  const term = normalizeSearchTerm(url.searchParams.get("q"));

  if (term.length < 2) {
    return NextResponse.json({ results: [] satisfies SearchResult[] });
  }

  const normalizedTerm = normalizeText(term);
  const supabaseAdmin = getSupabaseAdmin();
  const idSalao = usuario.id_salao;

  const clientesQuery = (supabaseAdmin as any)
    .from("clientes")
    .select("id, nome, whatsapp, telefone, email")
    .eq("id_salao", idSalao)
    .or(
      [
        `nome.ilike.%${term}%`,
        `whatsapp.ilike.%${term}%`,
        `telefone.ilike.%${term}%`,
        `email.ilike.%${term}%`,
      ].join(",")
    )
    .order("nome", { ascending: true })
    .limit(6);

  const servicosQuery = (supabaseAdmin as any)
    .from("servicos")
    .select("id, nome, categoria, preco_padrao, preco, status, ativo")
    .eq("id_salao", idSalao)
    .or([`nome.ilike.%${term}%`, `categoria.ilike.%${term}%`].join(","))
    .order("nome", { ascending: true })
    .limit(6);

  const agendamentosQuery = (supabaseAdmin as any)
    .from("agendamentos")
    .select(
      "id, data, hora_inicio, status, cliente_id, servico_id, clientes(nome), servicos(nome)"
    )
    .eq("id_salao", idSalao)
    .order("data", { ascending: false })
    .order("hora_inicio", { ascending: true })
    .limit(60);

  const comandasQuery = (supabaseAdmin as any)
    .from("comandas")
    .select("id, numero, status, total, aberta_em, id_cliente, clientes(nome)")
    .eq("id_salao", idSalao)
    .order("aberta_em", { ascending: false })
    .limit(40);

  const [clientesRes, servicosRes, agendamentosRes, comandasRes] =
    await Promise.allSettled([
      clientesQuery,
      servicosQuery,
      agendamentosQuery,
      comandasQuery,
    ]);

  const results: SearchResult[] = [];

  if (clientesRes.status === "fulfilled" && !clientesRes.value.error) {
    for (const cliente of clientesRes.value.data || []) {
      const contato = cliente.whatsapp || cliente.telefone || cliente.email || "Sem contato";
      results.push({
        id: String(cliente.id),
        type: "cliente",
        title: cliente.nome || "Cliente sem nome",
        description: `Cadastro do cliente • ${contato}`,
        href: `/clientes/${cliente.id}`,
      });
    }
  }

  if (servicosRes.status === "fulfilled" && !servicosRes.value.error) {
    for (const servico of servicosRes.value.data || []) {
      const preco = Number(servico.preco_padrao ?? servico.preco ?? 0);
      const status = servico.ativo === false ? "inativo" : servico.status || "ativo";
      results.push({
        id: String(servico.id),
        type: "servico",
        title: servico.nome || "Serviço sem nome",
        description: `${servico.categoria || "Catálogo"} • ${formatCurrency(preco)} • ${status}`,
        href: `/servicos/${servico.id}`,
      });
    }
  }

  if (agendamentosRes.status === "fulfilled" && !agendamentosRes.value.error) {
    for (const agendamento of agendamentosRes.value.data || []) {
      const clienteNome = relatedName(agendamento.clientes);
      const servicoNome = relatedName(agendamento.servicos);
      const haystack = normalizeText(
        `${clienteNome} ${servicoNome} ${agendamento.status} ${agendamento.data} ${agendamento.hora_inicio}`
      );

      if (!haystack.includes(normalizedTerm)) continue;

      results.push({
        id: String(agendamento.id),
        type: "agendamento",
        title: clienteNome || "Agendamento",
        description: `${servicoNome || "Serviço"} • ${formatDate(agendamento.data)} às ${
          agendamento.hora_inicio || "--:--"
        } • ${agendamento.status || "sem status"}`,
        href: `/agenda?cliente=${agendamento.cliente_id || ""}&agendamento=${agendamento.id}`,
      });
    }
  }

  if (comandasRes.status === "fulfilled" && !comandasRes.value.error) {
    for (const comanda of comandasRes.value.data || []) {
      const clienteNome = relatedName(comanda.clientes);
      const numero = comanda.numero ? `#${comanda.numero}` : String(comanda.id).slice(0, 8);
      const haystack = normalizeText(
        `${numero} ${clienteNome} ${comanda.status} ${comanda.total} ${comanda.aberta_em}`
      );

      if (!haystack.includes(normalizedTerm)) continue;

      results.push({
        id: String(comanda.id),
        type: "comanda",
        title: `Comanda ${numero}`,
        description: `${clienteNome || "Cliente não informado"} • ${formatCurrency(
          comanda.total
        )} • ${comanda.status || "sem status"}`,
        href: `/comandas/${comanda.id}`,
      });
    }
  }

  return NextResponse.json({
    results: results.slice(0, 12),
  });
}
