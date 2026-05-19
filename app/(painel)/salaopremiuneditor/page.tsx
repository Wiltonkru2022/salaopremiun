"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLoading from "@/components/ui/AppLoading";
import QrCodeArtEditor from "@/components/perfil-salao/QrCodeArtEditor";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  buildDefaultSalaoSlug,
  buildSalaoPublicUrl,
  normalizeSalaoSlug,
} from "@/lib/saloes/public-link";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";

type SalaoEditorData = {
  nome: string;
  logo_url: string | null;
  app_cliente_slug: string | null;
};

export default function SalaoPremiunEditorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salao, setSalao] = useState<SalaoEditorData | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const session = await getUsuarioLogado();
      if (!mounted) return;

      if (!session.ok || !session.idSalao) {
        setError(session.error || "Nao foi possivel abrir o editor.");
        setLoading(false);
        return;
      }

      const supabase = asLooseSupabaseClient(session.supabase);
      const { data, error: salaoError } = await supabase
        .from("saloes")
        .select("nome, logo_url, app_cliente_slug")
        .eq("id", session.idSalao)
        .maybeSingle<SalaoEditorData>();

      if (!mounted) return;

      if (salaoError || !data) {
        setError("Nao foi possivel carregar os dados do salao.");
        setLoading(false);
        return;
      }

      setSalao({
        nome: String(data.nome || "SalãoPremiun"),
        logo_url: data.logo_url ? String(data.logo_url) : null,
        app_cliente_slug: data.app_cliente_slug
          ? String(data.app_cliente_slug)
          : null,
      });
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const publicSlug = useMemo(() => {
    if (!salao) return "salao";
    return (
      normalizeSalaoSlug(salao.app_cliente_slug || "") ||
      buildDefaultSalaoSlug(salao.nome)
    );
  }, [salao]);

  const publicUrl = useMemo(() => buildSalaoPublicUrl(publicSlug), [publicSlug]);
  const qrCodeUrl = useMemo(
    () => `/api/painel/qrcode?text=${encodeURIComponent(publicUrl)}`,
    [publicUrl]
  );

  if (loading) {
    return (
      <AppLoading
        title="SalãoPremiun Editor"
        message="Abrindo o editor de marketing..."
      />
    );
  }

  if (error || !salao) {
    return (
      <div className="p-6">
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error || "Nao foi possivel abrir o editor."}
        </div>
      </div>
    );
  }

  return (
    <QrCodeArtEditor
      open
      onClose={() => router.push("/perfil-salao")}
      publicUrl={publicUrl}
      qrCodeUrl={qrCodeUrl}
      publicSlug={publicSlug}
      salaoNome={salao.nome || "SalãoPremiun"}
      logoUrl={salao.logo_url}
    />
  );
}
