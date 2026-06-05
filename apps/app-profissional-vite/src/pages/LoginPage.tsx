import { Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";

export function LoginPage() {
  const { login } = useAuth();
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(cpf, senha);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 py-8 text-white">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <img src="/app-profissional/icons/icon-192.png" alt="Salão Premiun" className="h-16 w-16 rounded-[1.35rem] shadow-2xl shadow-amber-500/10" />
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Salão Premiun</div>
            <div className="mt-1 text-sm font-bold text-zinc-400">Profissional</div>
          </div>
        </div>
        <h1 className="text-5xl font-black tracking-[-0.08em]">App profissional</h1>
        <p className="mt-3 text-base font-semibold leading-7 text-zinc-300">Entre com CPF e senha para abrir sua agenda, comandas e clientes.</p>

        <div className="mt-8 grid gap-4">
          <Field label="CPF">
            <div className="relative">
              <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={19} />
              <Input className="w-full bg-white pl-11 text-zinc-950" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(event) => setCpf(event.target.value)} />
            </div>
          </Field>
          <Field label="Senha">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={19} />
              <Input className="w-full bg-white pl-11 pr-12 text-zinc-950" type={showPassword ? "text" : "password"} placeholder="Sua senha" value={senha} onChange={(event) => setSenha(event.target.value)} />
              <button type="button" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-zinc-500" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Ver senha"}>
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </Field>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">{error}</div> : null}

        <Button
          loading={loading}
          variant="secondary"
          className="mt-6 w-full !border-amber-300 !bg-amber-400 !text-zinc-950 active:!bg-amber-300"
        >
          Entrar
        </Button>
      </form>
    </main>
  );
}
