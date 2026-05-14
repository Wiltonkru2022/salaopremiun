import Link from "next/link";
import { getSecuritySupportPath, type SecurityTipoUsuario } from "@/lib/security/user-security";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getTipoLabel(tipo: SecurityTipoUsuario) {
  if (tipo === "cliente") return "App Cliente";
  if (tipo === "profissional") return "App Profissional";
  return "Painel do Salão";
}

export default function ContaBloqueadaPage({ searchParams }: PageProps) {
  const tipo = String(firstValue(searchParams?.tipo) || "salao") as SecurityTipoUsuario;
  const motivo = String(firstValue(searchParams?.motivo) || "").trim();
  const returnTo = String(firstValue(searchParams?.returnTo) || "").trim();
  const origem = String(firstValue(searchParams?.origem) || "").trim();
  const supportHref = getSecuritySupportPath(tipo);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center">
        <section className="w-full rounded-[28px] border border-rose-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="mb-6 inline-flex rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-rose-700">
            Acesso bloqueado
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Sua conta foi bloqueada por segurança.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            {motivo ||
              `O sistema pausou o acesso do ${getTipoLabel(tipo).toLowerCase()} até que a verificação seja concluída ou o bloqueio seja liberado.`}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Área
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {getTipoLabel(tipo)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Origem
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {origem || "Segurança automática"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Próximo passo
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Fale com o suporte
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {returnTo ? (
              <Link
                href={returnTo}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Voltar
              </Link>
            ) : null}
            <Link
              href={supportHref}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Abrir suporte
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
