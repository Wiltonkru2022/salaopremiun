import { notFound } from "next/navigation";
import AdminBlogEditor from "@/components/blog/AdminBlogEditor";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAdminBlogPostBySlug, getBlogCategories } from "@/lib/blog/service";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminMasterBlogEditorPage({ params }: Props) {
  await requireAdminMasterUser("comunicacao_ver");

  const { slug } = await params;
  const categories = await getBlogCategories();
  const post = slug === "novo" ? null : await getAdminBlogPostBySlug(slug);

  if (slug !== "novo" && !post) notFound();

  return <AdminBlogEditor post={post} categories={categories} />;
}

