"use client";

import { useMemo } from "react";
import QrCodeArtEditor from "@/components/perfil-salao/QrCodeArtEditor";
import { buildSalaoPublicUrl } from "@/lib/saloes/public-link";

const DEV_SALAO_NOME = "Studio Maos de Fadas";
const DEV_SALAO_SLUG = "studio-maos-de-fadas";

export default function SalaoPremiunEditorProjectPageClient({ slug }: { slug: string }) {
  const publicUrl = useMemo(() => buildSalaoPublicUrl(DEV_SALAO_SLUG), []);
  const qrCodeUrl = useMemo(
    () => `/api/painel/qrcode?text=${encodeURIComponent(publicUrl)}`,
    [publicUrl]
  );

  return (
    <QrCodeArtEditor
      open
      onClose={() => {
        window.location.assign("/");
      }}
      publicUrl={publicUrl}
      qrCodeUrl={qrCodeUrl}
      publicSlug={DEV_SALAO_SLUG}
      salaoNome={DEV_SALAO_NOME}
      logoUrl={null}
      initialProjectSlug={slug}
    />
  );
}
