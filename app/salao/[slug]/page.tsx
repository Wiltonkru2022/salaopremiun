import type { Metadata } from "next";
import ClienteSalonPage from "@/app/app-cliente/salao/[id]/page";
import { isSeoBlockedSalonSlug } from "@/lib/seo/public-routes";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  if (isSeoBlockedSalonSlug(slug)) {
    return {
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {};
}

export default async function PublicSalaoShortcutPage({
  params,
}: Props) {
  const { slug } = await params;
  return <ClienteSalonPage params={Promise.resolve({ id: slug })} publicOnly />;
}
