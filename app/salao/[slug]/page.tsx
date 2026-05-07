import { redirect } from "next/navigation";

export default async function PublicSalaoShortcutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/app-cliente/salao/${encodeURIComponent(slug)}`);
}
