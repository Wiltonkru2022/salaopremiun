import { APP_VERSION } from "@/lib/app-version";

export default function AppVersionBadge({ label = "Versão" }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
      <span className="font-bold text-zinc-800">{label}</span> {APP_VERSION}
    </div>
  );
}

