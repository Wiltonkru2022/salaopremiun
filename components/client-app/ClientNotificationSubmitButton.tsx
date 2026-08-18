"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export default function ClientNotificationSubmitButton({
  label,
  pendingLabel,
  compact = false,
}: {
  label: string;
  pendingLabel: string;
  compact?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        compact
          ? "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800 disabled:cursor-wait disabled:opacity-60"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800 disabled:cursor-wait disabled:opacity-60"
      }
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : null}
      {pending ? pendingLabel : label}
    </button>
  );
}
