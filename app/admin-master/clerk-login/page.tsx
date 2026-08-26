"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ClerkAdminSignIn } from "@/components/auth/ClerkAdminSignIn";
import {
  ADMIN_MASTER_HOME_PATH,
  sanitizeAdminMasterNextPath,
} from "@/lib/admin-master/auth/login-path";

const PAINEL_HOST =
  process.env.NEXT_PUBLIC_PAINEL_HOST ||
  process.env.PAINEL_HOST ||
  "painel.salaopremiun.com.br";

function buildPainelHostUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `https://${PAINEL_HOST}${normalizedPath}`;
}

export default function AdminMasterClerkLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4efe7]" />}>
      <AdminMasterClerkLoginContent />
    </Suspense>
  );
}

function AdminMasterClerkLoginContent() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () =>
      sanitizeAdminMasterNextPath(searchParams.get("next")) ||
      ADMIN_MASTER_HOME_PATH,
    [searchParams]
  );

  const onAuthenticated = useCallback((redirectTo: string) => {
    if (typeof window === "undefined") return;
    if (window.location.hostname !== PAINEL_HOST && redirectTo.startsWith("/")) {
      window.location.assign(buildPainelHostUrl(redirectTo));
      return;
    }
    window.location.assign(redirectTo);
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f1e7,_#efe5d7_52%,_#eadfce_100%)] px-4 py-8">
      <div className="mx-auto max-w-xl rounded-[28px] border border-[#d9cfc1] bg-[#fffdf9] p-6 shadow-[0_24px_70px_rgba(57,39,18,0.14)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7c45]">
          SalãoPremium
        </p>
        <h1 className="mt-2 text-3xl font-black text-[#21170f]">
          Admin Master protegido pelo Clerk
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6b5b45]">
          Entre com sua conta administrativa. O acesso só é liberado depois da validação do usuário, permissões e segundo fator.
        </p>

        <div className="mt-6">
          <ClerkAdminSignIn
            exchangeEndpoint="/api/admin-master/auth/clerk"
            nextPath={nextPath}
            onAuthenticated={onAuthenticated}
          />
        </div>
      </div>
    </main>
  );
}
