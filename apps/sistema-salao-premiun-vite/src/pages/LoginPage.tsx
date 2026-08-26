import { LogIn } from "lucide-react";
import { Button } from "../components/ui";

export function LoginPage({ error }: { error: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" className="h-16 w-16 rounded-2xl" alt="Salão Premiun" />
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Salão Premiun</div>
            <h1 className="text-3xl font-black tracking-[-0.06em] text-zinc-950">Painel do salão</h1>
          </div>
        </div>

        <p className="mt-5 text-sm font-bold leading-6 text-zinc-500">
          O acesso do painel é protegido pelo Clerk. Entre pela página oficial para continuar.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <Button
          className="mt-6 w-full"
          onClick={() => {
            const returnTo = `${window.location.pathname}${window.location.search}` || "/dashboard?boot=1";
            window.location.assign(
              `https://login.salaopremiun.com.br/login-clerk?returnTo=${encodeURIComponent(returnTo)}`
            );
          }}
        >
          <LogIn size={18} />
          Entrar com segurança
        </Button>
      </div>
    </main>
  );
}
