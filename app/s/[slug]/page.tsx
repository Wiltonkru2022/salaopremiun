import { permanentRedirect } from "next/navigation";

export default async function ShortPublicSalaoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/salao/${encodeURIComponent(slug)}`);
}
