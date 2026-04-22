"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import type {
  Permissoes,
  UsuarioSistemaRow,
  UsuarioSupabase,
} from "./types";

type UseAssinaturaAccessParams = {
  supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>;
};

export function useAssinaturaAccess({
  supabase,
}: UseAssinaturaAccessParams) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSupabase | null>(null);
  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [acessoCarregado, setAcessoCarregado] = useState(false);
  const [nivel, setNivel] = useState("");

  const carregarAcesso = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      router.replace("/login");
      return null;
    }

    const { data: usuarioDb, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id, id_salao, nivel, status")
      .eq("auth_user_id", user.id)
      .maybeSingle<UsuarioSistemaRow>();

    if (usuarioError || !usuarioDb?.id || !usuarioDb?.id_salao) {
      throw new Error("Não foi possível localizar o usuário do sistema.");
    }

    if (String(usuarioDb.status || "").toLowerCase() !== "ativo") {
      throw new Error("Usuário inativo.");
    }

    const { data: permissoesDb } = await supabase
      .from("usuarios_permissoes")
      .select("agenda_criar, agenda_editar, agenda_excluir, agenda_ver, caixa_fechar, caixa_operar, caixa_ver, clientes_criar, clientes_editar, clientes_excluir, clientes_ver, comandas_criar, comandas_editar, comandas_excluir, comandas_ver, comissoes_pagar, comissoes_ver, configuracoes_editar, configuracoes_ver, estoque_movimentar, estoque_ver, id, id_salao, id_usuario, produtos_criar, produtos_editar, produtos_excluir, produtos_ver, profissionais_criar, profissionais_editar, profissionais_excluir, profissionais_ver, relatorios_ver, servicos_criar, servicos_editar, servicos_excluir, servicos_ver, vendas_excluir, vendas_reabrir, vendas_ver")
      .eq("id_usuario", usuarioDb.id)
      .eq("id_salao", usuarioDb.id_salao)
      .maybeSingle<Record<string, unknown>>();

    const permissoesFinais = {
      ...buildPermissoesByNivel(usuarioDb.nivel),
      ...sanitizePermissoesDb(permissoesDb),
      assinatura_ver:
        String(usuarioDb.nivel || "").toLowerCase() === "admin" &&
        Boolean(
          permissoesDb?.assinatura_ver ??
            buildPermissoesByNivel(usuarioDb.nivel).assinatura_ver
        ),
    } as Permissoes;

    setUsuario(user as UsuarioSupabase);
    setPermissoes(permissoesFinais);
    setNivel(String(usuarioDb.nivel || "").toLowerCase());
    setAcessoCarregado(true);

    if (!permissoesFinais.assinatura_ver) {
      router.replace("/dashboard");
      return null;
    }

    return {
      user: user as UsuarioSupabase,
      usuarioDb,
    };
  }, [router, supabase]);

  return {
    usuario,
    permissoes,
    acessoCarregado,
    nivel,
    carregarAcesso,
  };
}
