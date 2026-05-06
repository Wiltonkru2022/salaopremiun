import { notFound } from "next/navigation";
import AdminBlogPreview from "@/components/blog/AdminBlogPreview";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAdminBlogPostBySlugOrId } from "@/lib/blog/service";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminMasterBlogPreviewPage({ params }: Props) {
  await requireAdminMasterUser("comunicacao_ver");

  const { slug } = await params;
  const post = slug === "novo" ? null : await getAdminBlogPostBySlugOrId(slug);

  if (slug !== "novo" && !post) notFound();

  return (
    <AdminBlogPreview
      editHref={`/admin-master/blog/${slug}`}
      fallback={{
        title: post?.title || "",
        slug: post?.slug || slug,
        description: post?.description || "",
        excerpt: post?.excerpt || "",
        categoryName: post?.categoryName || "Blog",
        categoryId: post?.categoryId,
        coverImage: post?.coverImage || "",
        coverAlt: post?.coverAlt || "",
        tags: (post?.tags || []).join(", "),
        content: post?.bodyHtml || post?.rawContent || "",
        readTime: post?.readTime || "1 min",
        featured: post?.featured,
      }}
    />
  );
}
