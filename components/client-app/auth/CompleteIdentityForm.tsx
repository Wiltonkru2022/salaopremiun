"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  completeClienteIdentityAction,
  type CompleteIdentityState,
} from "@/app/app-cliente/atualizar-acesso/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-bold text-white disabled:opacity-60"
    >
      {pending ? "Atualizando..." : "Atualizar meu acesso"}
    </button>
  );
}

export default function CompleteIdentityForm({
  whatsapp,
  next,
}: {
  whatsapp?: string | null;
  next?: string | null;
}) {
  const [state, action] = useActionState<CompleteIdentityState, FormData>(
    completeClienteIdentityAction,
    { error: null }
  );

  return (
    <form action={action} className="rounded-[1.8rem] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <h2 className="text-xl font-black text-zinc-950">Complete seu novo acesso</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        A senha antiga será aposentada. Depois desta atualização você entra com CPF + data de nascimento.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-zinc-700">CPF</label>
          <input name="cpf" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} required className="h-12 w-full rounded-2xl border border-zinc-200 px-4 outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Data de nascimento</label>
          <input name="dataNascimento" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} required className="h-12 w-full rounded-2xl border border-zinc-200 px-4 outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Confirme seu WhatsApp</label>
          <input name="whatsapp" type="tel" inputMode="tel" defaultValue={whatsapp || ""} required className="h-12 w-full rounded-2xl border border-zinc-200 px-4 outline-none" />
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Seu CPF não é colocado em URL, mensagem, analytics ou log de aplicação.
        </div>
        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
        ) : null}
        <SubmitButton />
      </div>
    </form>
  );
}
