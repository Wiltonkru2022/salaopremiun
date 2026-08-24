"use client";

import { useState } from "react";
import { UserRound, UsersRound } from "lucide-react";
import { selectBookingPersonAction } from "@/app/app-cliente/salao/[id]/reserva/person-actions";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskWhatsapp(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function ClientBookingPersonStep({
  idSalao,
  error = false,
}: {
  idSalao: string;
  error?: boolean;
}) {
  const [tipo, setTipo] = useState<"mim" | "outra_pessoa">("mim");
  const [whatsapp, setWhatsapp] = useState("");

  return (
    <form
      action={selectBookingPersonAction}
      className="mx-auto min-h-dvh max-w-md bg-[#050505] px-5 pb-28 pt-8 text-white"
    >
      <input type="hidden" name="salao" value={idSalao} />
      <input type="hidden" name="pessoa_tipo" value={tipo} />

      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f6b93f]">
        Reserva online
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">
        Para quem é este agendamento?
      </h1>
      <p className="mt-3 text-base leading-6 text-zinc-400">
        Escolha quem vai receber o atendimento. Você poderá continuar normalmente para profissional, serviço e horário.
      </p>

      <div className="mt-7 space-y-3">
        <button
          type="button"
          onClick={() => setTipo("mim")}
          className={`flex w-full items-center gap-4 rounded-[1.2rem] border p-4 text-left transition ${
            tipo === "mim"
              ? "border-[#f6b93f] bg-[#15130d]"
              : "border-white/10 bg-[#111214]"
          }`}
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[#1d1e21] text-[#f6b93f]">
            <UserRound size={28} />
          </span>
          <span>
            <strong className="block text-lg">Para mim</strong>
            <span className="mt-1 block text-sm text-zinc-400">
              Usar meus dados cadastrados no SalãoPremium.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTipo("outra_pessoa")}
          className={`flex w-full items-center gap-4 rounded-[1.2rem] border p-4 text-left transition ${
            tipo === "outra_pessoa"
              ? "border-[#f6b93f] bg-[#15130d]"
              : "border-white/10 bg-[#111214]"
          }`}
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[#1d1e21] text-[#f6b93f]">
            <UsersRound size={28} />
          </span>
          <span>
            <strong className="block text-lg">Para outra pessoa</strong>
            <span className="mt-1 block text-sm text-zinc-400">
              Informe quem será atendido e o WhatsApp dessa pessoa.
            </span>
          </span>
        </button>
      </div>

      {tipo === "outra_pessoa" ? (
        <div className="mt-6 space-y-4 rounded-[1.2rem] border border-white/10 bg-[#111214] p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome da pessoa
            </label>
            <input
              name="pessoa_nome"
              type="text"
              required
              autoComplete="name"
              placeholder="Nome de quem será atendido"
              className="h-14 w-full rounded-2xl border border-white/10 bg-[#18191c] px-4 text-base text-white outline-none focus:border-[#f6b93f]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              WhatsApp da pessoa
            </label>
            <input
              name="pessoa_whatsapp"
              type="tel"
              required
              inputMode="tel"
              value={whatsapp}
              onChange={(event) => setWhatsapp(maskWhatsapp(event.target.value))}
              placeholder="(00) 00000-0000"
              className="h-14 w-full rounded-2xl border border-white/10 bg-[#18191c] px-4 text-base text-white outline-none focus:border-[#f6b93f]"
            />
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Confirmações, alterações e lembretes deste atendimento poderão ser enviados para esse número.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          Confira o nome e o WhatsApp da pessoa antes de continuar.
        </div>
      ) : null}

      <button
        type="submit"
        className="mt-7 h-14 w-full rounded-2xl bg-[#f6b93f] text-lg font-black text-black"
      >
        Continuar
      </button>
    </form>
  );
}
