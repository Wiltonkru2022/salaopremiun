"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  completeClienteMigrationTokenAction,
  type MigrationTokenState,
} from "@/app/app-cliente/atualizar-acesso/[token]/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-black text-white disabled:opacity-60">
      {pending ? "Atualizando..." : "Confirmar meus dados"}
    </button>
  );
}

export default function MigrationTokenForm({ token }: { token: string }) {
  const [state, action] = useActionState<MigrationTokenState, FormData>(
    completeClienteMigrationTokenAction,
    { error: null }
  );
  const input = "h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none focus:border-zinc-400";

  return (
    <form action={action} className="rounded-[1.8rem] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <input type="hidden" name="token" value={token} />
      <h2 className="text-xl font-black">Atualize seu acesso</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Preencha seus dados aqui, não por mensagem. O link é pessoal e funciona uma única vez.
      </p>
      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">CPF</label>
          <input name="cpf" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} required className={input} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Data de nascimento</label>
          <input name="dataNascimento" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} required className={input} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">WhatsApp</label>
          <input name="whatsapp" type="tel" inputMode="tel" placeholder="(00) 00000-0000" required className={input} />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-600">
          E-mail continua opcional. Depois de entrar, você pode adicionar ou alterar o e-mail somente com código de confirmação.
        </div>
        {state.error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div> : null}
        <Submit />
      </div>
    </form>
  );
}
