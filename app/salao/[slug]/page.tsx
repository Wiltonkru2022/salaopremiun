import type { Metadata } from "next";
import ClienteSalonPage from "@/app/app-cliente/salao/[id]/page";
import { generateClientSalonMetadata } from "@/lib/client-app/salon-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generateClientSalonMetadata(slug);
}

export default async function PublicSalaoShortcutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ClienteSalonPage params={Promise.resolve({ id: slug })} />;
}
