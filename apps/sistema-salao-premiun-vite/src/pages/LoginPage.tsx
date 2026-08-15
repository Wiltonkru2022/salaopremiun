import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button, Input } from "../components/ui";

export function LoginPage({
  error,
  onLogin
}: {
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <form
        className="w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-soft"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setLocalError("");
          try {
            await onLogin(email, password);
          } catch (err) {
            setLocalError(err instanceof Error ? err.message : "Erro ao entrar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" className="h-16 w-16 rounded-2xl" alt="Salão Premiun" />
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Salão Premiun</div>
            <h1 className="text-3xl font-black tracking-[-0.06em] text-zinc-950">Painel do salão</h1>
          </div>
        </div>

        <p className="mt-5 text-sm font-bold leading-6 text-zinc-500">
          Entre com o e-mail e senha do painel atual para abrir a versão Vite.
        </p>

        {(localError || error) ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {localError || error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">E-mail</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <Input className="pl-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" required />
            </div>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Senha</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <Input className="pl-10 pr-12" type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="button" onClick={() => setShow((value) => !value)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-zinc-500" aria-label="Ver senha">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
        </div>

        <Button className="mt-6 w-full" loading={busy}>Entrar</Button>
      </form>
    </main>
  );
}
