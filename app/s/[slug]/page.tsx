import ClienteSalonPage from "@/app/app-cliente/salao/[id]/page";

export default async function ShortPublicSalaoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ClienteSalonPage params={Promise.resolve({ id: slug })} />;
}
