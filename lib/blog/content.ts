export type BlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  categorySlug: string;
  categoryName: string;
  readTime: string;
  publishedAt: string;
  coverImage: string;
  coverAlt: string;
  tags: string[];
  body: string[];
  bodyHtml?: string;
  featured?: boolean;
  views?: number;
  categoryId?: string;
  status?: "rascunho" | "publicado" | "arquivado";
  rawContent?: string;
};
