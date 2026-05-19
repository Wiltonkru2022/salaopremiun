import SalaoPremiunEditorProjectPageClient from "./page-client";

export default async function SalaoPremiunEditorProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SalaoPremiunEditorProjectPageClient slug={slug} />;
}
