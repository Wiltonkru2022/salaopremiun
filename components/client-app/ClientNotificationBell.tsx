import Link from "next/link";
import { Bell } from "lucide-react";

export default function ClientNotificationBell({
  unreadCount,
  dark = false,
  className = "",
}: {
  unreadCount: number;
  dark?: boolean;
  className?: string;
}) {
  const count = Math.max(0, Number(unreadCount || 0));
  const badge = count > 99 ? "99+" : String(count);

  return (
    <Link
      href="/app-cliente/notificacoes"
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
        dark
          ? "border border-white/10 bg-white/5 text-[#f5c15a]"
          : "border border-zinc-200 bg-white text-zinc-950 shadow-sm"
      } ${className}`}
      aria-label={count ? `Notificações, ${count} não lidas` : "Notificações"}
    >
      <Bell size={23} />
      {count > 0 ? (
        <span
          className={`absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] font-black leading-none ${
            dark
              ? "border-[#050505] bg-[#f5bd42] text-black"
              : "border-white bg-[#f5bd42] text-black"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
