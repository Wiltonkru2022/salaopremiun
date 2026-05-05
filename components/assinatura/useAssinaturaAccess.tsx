"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { readPainelSessionSnapshot } from "@/lib/painel/session-snapshot";
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

  const isAuthLockError = useCallback((error: unknown) => {
    const message = String(
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: unknown }).message
        : error || ""
    ).toLowerCase();

    return (
      message.includes("auth-token") ||
      message.includes("navigatorlockmanager") ||
      message.includes("lock") ||
      message.includes("request was aborted") ||
      message.includes("released because another request")
    );
  }, []);

  const wait = useCallback((ms: number) => {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }, []);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, ms: number) => {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        window.setTimeout(() => reject(new Error("AUTH_TIMEOUT")), ms);
      }),
    ]);
  }, []);

  const safeGetAuthUser = useCallback(async () => {
    try {
      const result = await withTimeout(supabase.auth.getUser(), 4000);

      if (result.error && isAuthLockError(result.error)) {
        await wait(250);

        const retry = await withTimeout(supabase.auth.getUser(), 4000).catch(
          () => null
        );

        if (retry && !retry.error && retry.data.user) {
          return retry.data.user;
        }

        const sessionRes = await supabase.auth.getSession();
        return sessionRes.data.session?.user || null;
      }

      if (result.error) {
        throw result.error;
      }

      return result.data.user || null;
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "AUTH_TIMEOUT") {
        try {
          const sessionRes = await supabase.auth.getSession();
          return sessionRes.data.session?.user || null;
        } catch {
          return null;
        }
      }

      if (isAuthLockError(error)) {
        try {
          await wait(250);
          const sessionRes = await supabase.auth.getSession();
          return sessionRes.data.session?.user || null;
        } catch {
          return null;
        }
      }

      throw error;
    }
  }, [isAuthLockError, supabase, wait, withTimeout]);

  const carregarAcesso = useCallback(async () => {
    try {
      const user = await safeGetAuthUser();

      if (!user) {
        setAcessoCarregado(true);
        router.replace("/login");
        return null;
      }

      const painelSession = readPainelSessionSnapshot();
      if (
        painelSession?.idSalao &&
        painelSession?.idUsuario &&
        painelSession?.permissoes
      ) {
        const permissoesSnapshot = {
          ...painelSession.permissoes,
          assinatura_ver:
            String(painelSession.nivel || "").toLowerCase() === "admin" &&
            Boolean(painelSession.permissoes.assinatura_ver),
        } as Permissoes;

        setUsuario(user as UsuarioSupabase);
        setPermissoes(permissoesSnapshot);
        setNivel(String(painelSession.nivel || "").toLowerCase());
        setAcessoCarregado(true);

        if (!permissoesSnapshot.assinatura_ver) {
          router.replace("/dashboard");
          return null;
        }

        return {
          user: user as UsuarioSupabase,
          usuarioDb: {
            id: painelSession.idUsuario,
            id_salao: painelSession.idSalao,
            nivel: painelSession.nivel,
            status: "ativo",
          } satisfies UsuarioSistemaRow,
        };
      }

      const { data: usuarioDb, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id, id_salao, nivel, status")
        .eq("auth_user_id", user.id)
        .maybeSingle<UsuarioSistemaRow>();

      if (usuarioError || !usuarioDb?.id || !usuarioDb?.id_salao) {
        throw new Error("Nao foi possivel localizar o usuario do sistema.");
      }

      if (String(usuarioDb.status || "").toLowerCase() !== "ativo") {
        throw new Error("Usuario inativo.");
      }

      const { data: permissoesDb } = await supabase
        .from("usuarios_permissoes")
        .select(
          "agenda_criar, agenda_editar, agenda_excluir, agenda_ver, caixa_fechar, caixa_operar, caixa_ver, clientes_criar, clientes_editar, clientes_excluir, clientes_ver, comandas_criar, comandas_editar, comandas_excluir, comandas_ver, comissoes_pagar, comissoes_ver, configuracoes_editar, configuracoes_ver, estoque_movimentar, estoque_ver, id, id_salao, id_usuario, produtos_criar, produtos_editar, produtos_excluir, produtos_ver, profissionais_criar, profissionais_editar, profissionais_excluir, profissionais_ver, relatorios_ver, servicos_criar, servicos_editar, servicos_excluir, servicos_ver, vendas_excluir, vendas_reabrir, vendas_ver"
        )
        .eq("id_usuario", usuarioDb.id)
        .eq("id_salao", usuarioDb.id_salao)
        .maybeSingle<Record<string, unknown>>();

      const permissoesPadrao = buildPermissoesByNivel(usuarioDb.nivel);
      const permissoesFinais = {
        ...permissoesPadrao,
        ...sanitizePermissoesDb(permissoesDb),
        assinatura_ver:
          String(usuarioDb.nivel || "").toLowerCase() === "admin" &&
          Boolean(permissoesPadrao.assinatura_ver),
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
    } catch (error) {
      setAcessoCarregado(true);
      throw error;
    }
  }, [router, safeGetAuthUser, supabase]);

  return {
    usuario,
    permissoes,
    acessoCarregado,
    nivel,
    carregarAcesso,
  };
}
