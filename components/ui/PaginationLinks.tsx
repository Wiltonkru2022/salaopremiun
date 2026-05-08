import Link from "next/link";

type PaginationLinksProps = {
  currentPage: number;
  pageSize?: number;
  totalItems?: number;
  hasMore?: boolean;
  maxPages?: number;
  className?: string;
  getHref: (page: number) => string;
};

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_MAX_PAGES = 10;

export default function PaginationLinks({
  currentPage,
  pageSize = DEFAULT_PAGE_SIZE,
  totalItems,
  hasMore,
  maxPages = DEFAULT_MAX_PAGES,
  className = "",
  getHref,
}: PaginationLinksProps) {
  const totalPages =
    typeof totalItems === "number"
      ? Math.max(1, Math.ceil(totalItems / pageSize))
      : Math.max(currentPage + (hasMore ? 2 : 1), 1);

  if (totalPages <= 1 && !hasMore) return null;

  const safeCurrent = Math.max(0, Math.min(currentPage, totalPages - 1));
  const blockStart = Math.floor(safeCurrent / maxPages) * maxPages;
  const blockEnd = Math.min(blockStart + maxPages, totalPages);
  const pages = Array.from({ length: blockEnd - blockStart }, (_, index) => blockStart + index);
  const canGoNext = safeCurrent + 1 < totalPages || Boolean(hasMore);
  const morePage = pages[pages.length - 1] + 1;
  const showMore = morePage < totalPages || (typeof totalItems !== "number" && Boolean(hasMore));

  const renderLink = (label: string, page: number, active = false, disabled = false) => {
    const classNameLink = [
      "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-bold transition",
      active
        ? "border-zinc-950 bg-zinc-950 text-white"
        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
      disabled ? "pointer-events-none opacity-45" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Link key={`${label}-${page}`} href={getHref(page)} className={classNameLink}>
        {label}
      </Link>
    );
  };

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
      aria-label="Paginação"
    >
      {renderLink("Próxima página", safeCurrent + 1, false, !canGoNext)}
      {pages.map((page) => renderLink(String(page + 1), page, page === safeCurrent))}
      {showMore ? renderLink("Mais", morePage, false, !canGoNext) : null}
    </nav>
  );
}
