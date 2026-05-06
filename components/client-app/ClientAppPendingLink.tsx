"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle, type LucideIcon } from "lucide-react";

function PendingHint({
  label,
  forcePending = false,
}: {
  label?: string;
  forcePending?: boolean;
}) {
  const { pending } = useLinkStatus();
  const isPending = pending || forcePending;

  return (
    <span
      aria-live="polite"
      className={`pointer-events-none absolute right-2 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 transition ${
        isPending ? "opacity-100" : "opacity-0"
      }`}
    >
      <LoaderCircle
        aria-hidden
        size={15}
        className={`shrink-0 ${isPending ? "animate-spin" : ""}`}
      />
      {isPending && label ? (
        <span className="ml-1 max-w-16 truncate text-[10px] font-bold leading-none">
          {label}
        </span>
      ) : null}
    </span>
  );
}

export default function ClientAppPendingLink({
  href,
  className,
  children,
  pendingLabel,
  icon: Icon,
  iconSize = 18,
  prefetch = true,
}: {
  href: string;
  className: string;
  children: ReactNode;
  pendingLabel?: string;
  icon?: LucideIcon;
  iconSize?: number;
  prefetch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [clicked, setClicked] = useState(false);
  const hrefPathname = useMemo(() => href.split("?")[0].split("#")[0], [href]);

  useEffect(() => {
    setClicked(false);
  }, [pathname]);

  useEffect(() => {
    if (!clicked) return;

    const timeout = window.setTimeout(() => {
      setClicked(false);
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [clicked]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (hrefPathname === pathname || clicked) {
      return;
    }

    event.preventDefault();
    setClicked(true);
    router.push(href);
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-disabled={clicked}
      onClick={handleClick}
      className={`relative ${className} ${clicked ? "pointer-events-none cursor-wait opacity-80" : ""}`}
    >
      {Icon ? <Icon size={iconSize} strokeWidth={2.4} /> : null}
      <span>{children}</span>
      <PendingHint label={pendingLabel} forcePending={clicked} />
    </Link>
  );
}
