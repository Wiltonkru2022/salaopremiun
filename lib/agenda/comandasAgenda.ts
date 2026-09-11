import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComandaResumo } from "@/components/agenda/page-types";

type BuscarComandasAbertasParams = {
  supabase: SupabaseClient;
  idSalao: string;
  clienteId: string;
};

type CriarComandaAgendaParams = {
  supabase: SupabaseClient;
  idSalao: string;
  clienteId: string;
};

export async function buscarComandasAbertasDoClienteAgenda({
  supabase,
  idSalao,
  clienteId,
}: BuscarComandasAbertasParams): Promise<ComandaResumo[]> {
  if (!idSalao || !clienteId) return [];

  const { data, error } = await supabase
    .from("comandas")
    .select("id, numero, status, id_cliente")
    .eq("id_salao", idSalao)
    .eq("id_cliente", clienteId)
    .in("status", ["aberta", "em_atendimento", "aguardando_pagamento"])
    .order("aberta_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar comandas abertas:", error);
    throw new Error("Erro ao buscar comandas abertas.");
  }

  return (data as ComandaResumo[]) || [];
}

export async function criarNovaComandaAgenda({
  supabase,
  idSalao,
  clienteId,
}: CriarComandaAgendaParams): Promise<ComandaResumo> {
  if (!idSalao) {
    throw new Error("Salão não identificado.");
  }

  const { data: ultimaRows, error: ultimaError } = await supabase
    .from("comandas")
    .select("numero")
    .eq("id_salao", idSalao)
    .order("numero", { ascending: false })
    .limit(1);

  if (ultimaError) {
    console.error("Erro ao buscar último número da comanda:", ultimaError);
    throw new Error("Erro ao gerar número da comanda.");
  }

  const ultimoNumero = ultimaRows?.[0]?.numero || 0;

  const { data, error } = await supabase
    .from("comandas")
    .insert({
      id_salao: idSalao,
      numero: ultimoNumero + 1,
      id_cliente: clienteId,
      status: "aberta",
      origem: "agenda",
    })
    .select("id, numero, status, id_cliente")
    .limit(1);

  if (error) {
    console.error("Erro ao criar comanda:", error);
    throw new Error("Erro ao criar nova comanda.");
  }

  const nova = data?.[0] as ComandaResumo | undefined;

  if (!nova) {
    throw new Error("Não foi possível criar a comanda.");
  }

  return nova;
}
