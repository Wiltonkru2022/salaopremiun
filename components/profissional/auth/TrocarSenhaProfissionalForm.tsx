"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import {
  trocarSenhaProfissionalAction,
  type TrocarSenhaProfissionalState,
} from "@/app/app-profissional/trocar-senha/actions";

const initialState: TrocarSenhaProfissionalState = {
  ok: false,
  message: null,
};

function PasswordField({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      <div className="relative mt-2">
        <input
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          className="h-12 w-full rounded-[18px] border border-zinc-200 bg-white px-4 pr-12 text-base text-zinc-950 outline-none transition focus:border-zinc-400"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-zinc-950 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <ShieldCheck size={17} />
      {pending ? "Salvando..." : "Salvar nova senha"}
    </button>
  );
}

export default function TrocarSenhaProfissionalForm() {
  const [state, formAction] = useActionState(
    trocarSenhaProfissionalAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
    >
      <div className="mb-4 flex items-start gap-3 rounded-[1.1rem] border border-zinc-200 bg-zinc-50 p-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-zinc-950 text-white">
          <KeyRound size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black text-zinc-950">Troca segura</div>
          <p className="mt-1 text-sm leading-5 text-zinc-500">
            Informe a senha atual antes de criar uma nova senha para o app.
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        <PasswordField
          name="senha_atual"
          label="Senha atual"
          placeholder="Digite sua senha atual"
        />
        <PasswordField
          name="nova_senha"
          label="Nova senha"
          placeholder="Minimo de 6 caracteres"
        />
        <PasswordField
          name="confirmar_senha"
          label="Confirmar nova senha"
          placeholder="Digite novamente"
        />

        {state.message ? (
          <div
            className={`rounded-[18px] border px-4 py-3 text-sm font-semibold ${
              state.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <SubmitButton />
      </div>
    </form>
  );
}
