"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Loader2, Power } from "lucide-react";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";

export default function ProdutosFeatureGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { snapshot } = usePainelSession();
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [ativadoLocalmente, setAtivadoLocalmente] = useState(false);
  const ativo = snapshot?.produtosModuloAtivo !== false || ativadoLocalmente;
  const admin = String(snapshot?.nivel || "").toLowerCase() === "admin";

  async function ativar() {
    if (!admin) return;
    try {
      setSaving(true);
      setErro("");
      const response = await fetch("/api/painel/produtos-modulo", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível ativar a funcionalidade.");
      setAtivadoLocalmente(true);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível ativar a funcionalidade.");
    } finally {
      setSaving(false);
    }
  }

  if (ativo) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-[30px] border border-zinc-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-zinc-950 text-white"><Boxes size={28} /></div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Funcionalidade opcional</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Produtos e Estoque estão desativados</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
          Nenhum dado foi apagado. Quando essa funcionalidade for ativada, produtos, estoque e os recursos de produto dentro de serviços, comandas e caixa voltam a ficar disponíveis.
        </p>
        {erro ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</div> : null}
        {admin ? (
          <button type="button" onClick={ativar} disabled={saving} className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white disabled:opacity-60">
            {saving ? <Loader2 className="animate-spin" size={17} /> : <Power size={17} />}
            {saving ? "Ativando..." : "Ativar Produtos e Estoque"}
          </button>
        ) : (
          <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Peça a um administrador do salão para ativar Produtos e Estoque.
          </div>
        )}
      </div>
    </div>
  );
}
