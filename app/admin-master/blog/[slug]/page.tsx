import { notFound } from "next/navigation";
import AdminBlogEditor from "@/components/blog/AdminBlogEditor";
import type { BlogPost } from "@/lib/blog/content";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAdminBlogPostBySlugOrId, getBlogCategories } from "@/lib/blog/service";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

function isUuid(value?: string | null) {
  return Boolean(
    String(value || "").match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  );
}

function preparePostForEditor(post: BlogPost | null, categories: Awaited<ReturnType<typeof getBlogCategories>>) {
  if (!post) return null;

  const category =
    categories.find((item) => item.id === post.categoryId) ||
    categories.find((item) => item.slug === post.categorySlug) ||
    categories[0] ||
    null;

  return {
    ...post,
    id: isUuid(post.id) ? post.id : "",
    categoryId: category?.id || post.categoryId,
  };
}

export default async function AdminMasterBlogEditorPage({ params }: Props) {
  await requireAdminMasterUser("comunicacao_ver");

  const { slug } = await params;
  const categories = await getBlogCategories();
  const post = slug === "novo" ? null : await getAdminBlogPostBySlugOrId(slug);

  if (slug !== "novo" && !post) notFound();

  return <AdminBlogEditor post={preparePostForEditor(post, categories)} categories={categories} />;
}
