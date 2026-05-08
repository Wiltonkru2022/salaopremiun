import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { publicarPreviewBlogPost } from "@/services/blogRouteService";

export async function POST(request: Request) {
  await requireAdminMasterUser("comunicacao_ver");

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const slug = await publicarPreviewBlogPost(body);

    revalidatePath("/admin-master/blog");
    revalidatePath(`/admin-master/blog/${slug}`);
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    revalidateTag("blog-public", "max");

    return NextResponse.json({ slug });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel publicar o preview.",
      },
      { status: 500 }
    );
  }
}
