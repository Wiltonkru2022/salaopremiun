import ClienteSalonPage from "@/app/app-cliente/salao/[id]/page";

export default async function PublicSalaoShortcutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ status?: string }>;
}) {
  const { slug } = await params;
  return (
    <ClienteSalonPage
      params={Promise.resolve({ id: slug })}
      searchParams={searchParams}
      publicOnly
    />
  );
}
