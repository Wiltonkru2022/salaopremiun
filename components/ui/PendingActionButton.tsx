"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export default function PendingActionButton({
  label,
  pendingLabel = "Salvando...",
  className = "",
  icon,
  disabled = false,
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : icon}
      {pending ? pendingLabel : label}
    </button>
  );
}
