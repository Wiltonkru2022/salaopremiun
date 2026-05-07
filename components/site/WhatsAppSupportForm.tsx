"use client";

import { useState } from "react";
import { Send } from "lucide-react";

const SUPPORT_PHONE = "5567984341742";

export default function WhatsAppSupportForm() {
  const [nome, setNome] = useState("");
  const [duvida, setDuvida] = useState("");

  function abrirWhatsApp() {
    const mensagem = [
      `Ola, meu nome e ${nome.trim() || "visitante"}.`,
      duvida.trim()
        ? `Minha duvida sobre o SalaoPremium: ${duvida.trim()}`
        : "Quero tirar uma duvida sobre o SalaoPremium.",
    ].join("\n\n");

    window.open(
      `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(mensagem)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <span className="text-lg font-black">W</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-zinc-950">Fale pelo WhatsApp</h3>
          <p className="text-sm text-emerald-800">
            Envie seu nome e sua duvida direto para o suporte.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <input
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Seu nome"
          className="h-12 rounded-2xl border border-emerald-200 bg-white px-4 text-base text-zinc-950 outline-none focus:border-emerald-500"
        />
        <textarea
          value={duvida}
          onChange={(event) => setDuvida(event.target.value)}
          placeholder="Digite sua duvida"
          rows={4}
          className="resize-none rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-zinc-950 outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={abrirWhatsApp}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <Send size={17} />
          Enviar para o WhatsApp
        </button>
      </div>
    </div>
  );
}
