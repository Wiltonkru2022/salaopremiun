import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import WhatsAppSupportClient from "@/components/admin-master/WhatsAppSupportClient";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

export const dynamic = "force-dynamic";

export default async function AdminMasterWhatsAppPage() {
  await requireAdminMasterUser("whatsapp_ver");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/admin-master/whatsapp/templates"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800 shadow-sm transition hover:bg-zinc-50"
        >
          <MessageSquareText size={16} />
          Templates WhatsApp
        </Link>
      </div>
      <WhatsAppSupportClient />
    </div>
  );
}
