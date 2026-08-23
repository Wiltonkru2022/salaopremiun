"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Boxes, Loader2, Power } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import { getErrorMessage } from "@/lib/get-error-message";

export default function ProdutosFeatureGate({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const { snapshot } = usePainelSession();
  const [loading, setLoading] = useState(true);
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!snapshot?.idSalao) return;
        const { data, error } = await (supabase as any)
          .from("saloes")
          .select("produtos_modulo_ativo")
          .eq("id", snapshot.idSalao)
          .maybeSingle();
        if (error) throw error;
        if (mounted) setAtivo(data?.produtos_modulo_ativo !== false);
      } catch (error) {
        if (mounted) setErro(getErrorMessage(error, "Não foi possível verificar o módulo de produtos."));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [snapshot?.idSalao, supabase]);

  async function ativar() {
    if (!snapshot?.idSalao) return;
    try {
      setSaving(true);
      setErro("");
      const { error } = await (supabase as any)
        .from("saloes")
        .update({ produtos_modulo_ativo: true, updated_at: new Date().toISOString() })
        .eq("id", snapshot.idSalao);
      if (error) throw error;
      setAtivo(true);
    } catch (error) {
      setErro(getErrorMessage(error, "Não foi possível ativar a funcionalidade."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  if (ativo) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-[30px] border border-zinc-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-zinc-950 text-white">
          <Boxes size={28} />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Funcionalidade opcional</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Produtos está desativado</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
          Seu salão informou no cadastro que não trabalha com produtos. Ative quando quiser começar a controlar estoque, custos e vendas de produtos.
        </p>
        {erro ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</div> : null}
        <button
          type="button"
          onClick={ativar}
          disabled={saving}
          className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={17} /> : <Power size={17} />}
          {saving ? "Ativando..." : "Ativar funcionalidade"}
        </button>
      </div>
    </div>
  );
}
