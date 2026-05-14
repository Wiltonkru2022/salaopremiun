import { permanentRedirect } from "next/navigation";
import { buildSalaoPublicUrl } from "@/lib/saloes/public-link";

export default async function PublicSalaoShortcutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(buildSalaoPublicUrl(slug));
}
