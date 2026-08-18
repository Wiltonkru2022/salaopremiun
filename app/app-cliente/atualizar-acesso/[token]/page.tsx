import Link from "next/link";
import MigrationTokenForm from "@/components/client-app/auth/MigrationTokenForm";

export const metadata = { title: "Atualizar acesso do App Cliente" };

export default async function ClienteMigrationTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="min-h-dvh bg-zinc-100 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <section className="rounded-[1.8rem] bg-zinc-950 p-5 text-white">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Link seguro do SalãoPremium</div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Novo acesso do App Cliente</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            O login passa a usar CPF + data de nascimento. Seus agendamentos e histórico continuam na mesma conta.
          </p>
        </section>
        <MigrationTokenForm token={token} />
        <Link href="/app-cliente/login" className="block text-center text-sm font-semibold text-zinc-500 underline underline-offset-4">Já atualizei meu cadastro</Link>
      </div>
    </main>
  );
}
