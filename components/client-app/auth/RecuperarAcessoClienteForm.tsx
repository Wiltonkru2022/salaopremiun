"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  confirmClienteChangeEmailAction,
  confirmClienteRecoveryEmailAction,
  confirmClienteRecoveryIdentityAction,
  requestClienteChangeEmailAction,
  requestClienteRecoveryEmailAction,
  requestClienteRecoveryIdentityEmailAction,
  startClienteRecoveryIdentityAction,
  type RecoverClienteAccessState,
} from "@/app/app-cliente/recuperar-acesso/actions";

const initial: RecoverClienteAccessState = {
  error: null,
  success: null,
  step: "choose",
};

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-12 w-full rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white disabled:opacity-60">
      {pending ? "Aguarde..." : children}
    </button>
  );
}

function Message({ state }: { state: RecoverClienteAccessState }) {
  return (
    <>
      {state.success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.success}</div> : null}
      {state.error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div> : null}
    </>
  );
}

export default function RecuperarAcessoClienteForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [mode, setMode] = useState<"choose" | "email" | "identity" | "change-email">("choose");
  const [emailState, emailRequest] = useActionState(requestClienteRecoveryEmailAction, initial);
  const [emailConfirmState, emailConfirm] = useActionState(confirmClienteRecoveryEmailAction, initial);
  const [identityState, identityStart] = useActionState(startClienteRecoveryIdentityAction, initial);
  const [identityEmailState, identityEmailRequest] = useActionState(requestClienteRecoveryIdentityEmailAction, initial);
  const [identityConfirmState, identityConfirm] = useActionState(confirmClienteRecoveryIdentityAction, initial);
  const [changeStartState, changeStart] = useActionState(startClienteRecoveryIdentityAction, initial);
  const [changeEmailState, changeEmailRequest] = useActionState(requestClienteChangeEmailAction, initial);
  const [changeConfirmState, changeConfirm] = useActionState(confirmClienteChangeEmailAction, initial);

  const card = "overflow-hidden rounded-[1.9rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]";
  const input = "h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none transition focus:border-zinc-400";

  if (mode === "choose") {
    return (
      <div className={card}>
        <h2 className="text-2xl font-black text-zinc-950">Recuperar acesso</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Não existe mais redefinição de senha no App Cliente. Escolha como confirmar sua identidade.</p>
        <div className="mt-5 grid gap-3">
          <button onClick={() => setMode("email")} className="rounded-2xl border border-zinc-200 p-4 text-left">
            <strong className="block text-zinc-950">Usar meu e-mail</strong>
            <span className="mt-1 block text-sm text-zinc-500">Receba um código de 6 dígitos.</span>
          </button>
          <button onClick={() => setMode("identity")} className="rounded-2xl border border-zinc-200 p-4 text-left">
            <strong className="block text-zinc-950">Usar CPF + data de nascimento</strong>
            <span className="mt-1 block text-sm text-zinc-500">Confirme seus dados e depois um e-mail.</span>
          </button>
          <button onClick={() => setMode("change-email")} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
            <strong className="block text-amber-950">Perdi acesso ao meu e-mail</strong>
            <span className="mt-1 block text-sm text-amber-800">Valide CPF+nascimento e confirme um novo e-mail.</span>
          </button>
        </div>
        <Link href="/app-cliente/login" className="mt-5 block text-center text-sm font-semibold text-zinc-600 underline underline-offset-4">Voltar para o login</Link>
      </div>
    );
  }

  if (mode === "email") {
    if (emailState.step !== "email-code") {
      return (
        <form action={emailRequest} className={card}>
          <button type="button" onClick={() => setMode("choose")} className="text-sm font-bold text-zinc-500">← Voltar</button>
          <h2 className="mt-4 text-xl font-black">Recuperar por e-mail</h2>
          <p className="mt-2 text-sm text-zinc-500">A resposta é sempre genérica para não revelar se uma conta existe.</p>
          <div className="mt-5 space-y-4">
            <input name="email" type="email" defaultValue={initialEmail} placeholder="voce@exemplo.com" required className={input} />
            <Message state={emailState} />
            <Submit>Enviar código</Submit>
          </div>
        </form>
      );
    }

    return (
      <form action={emailConfirm} className={card}>
        <h2 className="text-xl font-black">Digite o código</h2>
        <p className="mt-2 text-sm text-zinc-500">Enviamos um código de 6 dígitos. Ele expira em 10 minutos.</p>
        <input type="hidden" name="email" value={emailState.email || ""} />
        <div className="mt-5 space-y-4">
          <input name="code" inputMode="numeric" maxLength={6} placeholder="000000" required className={input} />
          <Message state={emailConfirmState} />
          <Submit>Confirmar código</Submit>
        </div>
      </form>
    );
  }

  if (mode === "identity") {
    const token = identityState.token || identityEmailState.token || null;
    if (!token) {
      return (
        <form action={identityStart} className={card}>
          <button type="button" onClick={() => setMode("choose")} className="text-sm font-bold text-zinc-500">← Voltar</button>
          <h2 className="mt-4 text-xl font-black">Confirmar identidade</h2>
          <div className="mt-5 space-y-4">
            <input name="cpf" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} required className={input} />
            <input name="dataNascimento" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} required className={input} />
            <Message state={identityState} />
            <Submit>Avançar</Submit>
          </div>
        </form>
      );
    }

    if (identityEmailState.step !== "identity-code") {
      return (
        <form action={identityEmailRequest} className={card}>
          <h2 className="text-xl font-black">Informe seu e-mail</h2>
          <p className="mt-2 text-sm text-zinc-500">Se a conta já tiver e-mail, informe o mesmo. Se não tiver, você pode cadastrar um endereço válido.</p>
          <input type="hidden" name="token" value={token} />
          <div className="mt-5 space-y-4">
            <input name="email" type="email" placeholder="voce@exemplo.com" required className={input} />
            <Message state={identityEmailState} />
            <Submit>Enviar código</Submit>
          </div>
        </form>
      );
    }

    return (
      <form action={identityConfirm} className={card}>
        <h2 className="text-xl font-black">Confirmar código</h2>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={identityEmailState.email || ""} />
        <div className="mt-5 space-y-4">
          <input name="code" inputMode="numeric" maxLength={6} placeholder="000000" required className={input} />
          <Message state={identityConfirmState} />
          <Submit>Recuperar acesso</Submit>
        </div>
      </form>
    );
  }

  const changeToken = changeStartState.token || changeEmailState.token || null;
  if (!changeToken) {
    return (
      <form action={changeStart} className={card}>
        <input type="hidden" name="purpose" value="change-email" />
        <button type="button" onClick={() => setMode("choose")} className="text-sm font-bold text-zinc-500">← Voltar</button>
        <h2 className="mt-4 text-xl font-black">Perdi meu e-mail</h2>
        <p className="mt-2 text-sm text-zinc-500">Primeiro confirme CPF e data de nascimento.</p>
        <div className="mt-5 space-y-4">
          <input name="cpf" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} required className={input} />
          <input name="dataNascimento" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} required className={input} />
          <Message state={changeStartState} />
          <Submit>Avançar</Submit>
        </div>
      </form>
    );
  }

  if (changeEmailState.step !== "change-email-code") {
    return (
      <form action={changeEmailRequest} className={card}>
        <input type="hidden" name="token" value={changeToken} />
        <h2 className="text-xl font-black">Novo e-mail</h2>
        <p className="mt-2 text-sm text-zinc-500">O endereço só será salvo depois que o código chegar e for confirmado.</p>
        <div className="mt-5 space-y-4">
          <input name="email" type="email" placeholder="novo@exemplo.com" required className={input} />
          <input name="confirmEmail" type="email" placeholder="Confirme o novo e-mail" className={input} />
          <Message state={changeEmailState} />
          <Submit>Enviar código</Submit>
        </div>
      </form>
    );
  }

  return (
    <form action={changeConfirm} className={card}>
      <input type="hidden" name="token" value={changeToken} />
      <input type="hidden" name="email" value={changeEmailState.email || ""} />
      <h2 className="text-xl font-black">Confirme o novo e-mail</h2>
      <div className="mt-5 space-y-4">
        <input name="code" inputMode="numeric" maxLength={6} placeholder="000000" required className={input} />
        <Message state={changeConfirmState} />
        <Submit>Confirmar novo e-mail</Submit>
      </div>
    </form>
  );
}
