"use client";

import Link from "next/link";

type PaginationControlsProps = {
  currentPage: number;
  pageSize?: number;
  totalItems?: number;
  hasMore?: boolean;
  maxPages?: number;
  className?: string;
  buildHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
};

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_MAX_PAGES = 10;

function getPageNumbers({
  currentPage,
  totalPages,
  maxPages,
}: {
  currentPage: number;
  totalPages: number;
  maxPages: number;
}) {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = Math.min(Math.max(currentPage, 0), safeTotal - 1);
  const blockStart = Math.floor(safeCurrent / maxPages) * maxPages;
  const blockEnd = Math.min(blockStart + maxPages, safeTotal);

  return Array.from({ length: blockEnd - blockStart }, (_, index) => blockStart + index);
}

export default function PaginationControls({
  currentPage,
  pageSize = DEFAULT_PAGE_SIZE,
  totalItems,
  hasMore,
  maxPages = DEFAULT_MAX_PAGES,
  className = "",
  buildHref,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages =
    typeof totalItems === "number"
      ? Math.max(1, Math.ceil(totalItems / pageSize))
      : Math.max(currentPage + (hasMore ? 2 : 1), 1);
  const pageNumbers = getPageNumbers({ currentPage, totalPages, maxPages });
  const canGoNext = currentPage + 1 < totalPages || Boolean(hasMore);
  const morePage = pageNumbers[pageNumbers.length - 1] + 1;
  const showMore = morePage < totalPages || (typeof totalItems !== "number" && Boolean(hasMore));

  function renderAction(label: string, page: number, active = false, disabled = false) {
    const baseClass = [
      "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-bold transition",
      active
        ? "border-zinc-950 bg-zinc-950 text-white"
        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
      disabled ? "pointer-events-none opacity-45" : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (buildHref && !disabled) {
      return (
        <Link key={`${label}-${page}`} href={buildHref(page)} className={baseClass}>
          {label}
        </Link>
      );
    }

    return (
      <button
        key={`${label}-${page}`}
        type="button"
        disabled={disabled}
        onClick={() => onPageChange?.(page)}
        className={baseClass}
      >
        {label}
      </button>
    );
  }

  if (totalPages <= 1 && !hasMore) return null;

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
      aria-label="Paginação"
    >
      {renderAction("Próxima página", currentPage + 1, false, !canGoNext)}
      {pageNumbers.map((page) => renderAction(String(page + 1), page, page === currentPage))}
      {showMore ? renderAction("Mais", morePage, false, !canGoNext) : null}
    </nav>
  );
}
