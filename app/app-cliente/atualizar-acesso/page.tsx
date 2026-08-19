import Link from "next/link";
import { redirect } from "next/navigation";
import CompleteIdentityForm from "@/components/client-app/auth/CompleteIdentityForm";
import { requireClienteAppContext } from "@/lib/client-context.server";

export const metadata = { title: "Atualizar meu acesso" };

export default async function AtualizarAcessoPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const context = await requireClienteAppContext();
  const params = searchParams ? await searchParams : undefined;
  if (context.migracaoIdentidadeConcluida && context.cpf && context.dataNascimento) {
    redirect(params?.next || "/app-cliente/agendamentos");
  }

  return (
    <main className="min-h-dvh bg-zinc-100 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-[1.8rem] bg-zinc-950 p-5 text-white">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Atualização de segurança</div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Seu acesso mudou</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Estamos migrando sua conta para CPF + data de nascimento sem apagar agendamentos, favoritos ou histórico.
          </p>
        </div>
        <CompleteIdentityForm whatsapp={context.whatsapp || context.telefone} next={params?.next || null} />
        <Link
          href="/app-cliente/logout?destino=/app-cliente/login"
          prefetch={false}
          className="block text-center text-sm font-semibold text-zinc-500 underline underline-offset-4"
        >
          Sair e voltar depois
        </Link>
      </div>
    </main>
  );
}
