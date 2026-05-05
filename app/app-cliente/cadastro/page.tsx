import Link from "next/link";
import { redirect } from "next/navigation";
import CadastroClienteForm from "@/components/client-app/auth/CadastroClienteForm";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import { canSalonAppearInClientApp } from "@/lib/client-app/eligibility";

export default async function CadastroClientePage({
  searchParams,
}: {
  searchParams: Promise<{ salao?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const salaoId = Array.isArray(params.salao) ? params.salao[0] : params.salao;
  const next =
    (Array.isArray(params.next) ? params.next[0] : params.next) || "";
  const session = await getClienteSessionFromCookie();

  if (session) {
    redirect(next || "/app-cliente/inicio");
  }

  const salaoContext = salaoId
    ? await canSalonAppearInClientApp(salaoId).catch(() => null)
    : null;

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff2c5_0,#f5f5f5_42%,#e7ecf2_100%)]">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#f5f5f5]/95 shadow-[0_0_80px_rgba(15,23,42,0.08)]">
        <header className="px-4 pt-4">
          <Link
            href={salaoContext?.salao?.id ? `/app-cliente/salao/${salaoContext.salao.id}` : "/app-cliente/inicio"}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600"
          >
            Voltar
          </Link>
        </header>

        <main className="flex flex-1 items-start px-4 py-4">
          <div className="w-full space-y-3.5">
            <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                Cadastro guiado
              </div>
              <h1 className="mt-3 text-[1.5rem] font-black tracking-[-0.04em] leading-none">
                Criar conta de cliente
              </h1>
              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                Crie sua conta uma vez e escolha onde quer agendar depois.
              </p>
            </section>

            <CadastroClienteForm
              salaoId={salaoContext?.salao?.id || salaoId || null}
              salaoNome={salaoContext?.salao?.nome || null}
              next={next || (salaoId ? `/app-cliente/salao/${salaoId}` : null)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
