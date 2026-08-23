"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

const SUPPORT_PHONE = "5567981431155";

export default function WhatsAppSupportForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState("");
  const [modalAberta, setModalAberta] = useState(false);

  function abrirWhatsApp() {
    const mensagem = [
      "Olá, suporte SalãoPremium!",
      `Nome: ${nome.trim() || "Não informado"}`,
      `E-mail: ${email.trim() || "Não informado"}`,
      `Assunto: ${assunto.trim() || "Suporte geral"}`,
    ].join("\n");

    window.open(
      `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(mensagem)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const campos = (
    <div className="grid gap-3">
      <input
        value={nome}
        onChange={(event) => setNome(event.target.value)}
        placeholder="Seu nome"
        autoComplete="name"
        className="h-12 rounded-2xl border border-emerald-200 bg-white px-4 text-base text-zinc-950 outline-none focus:border-emerald-500"
      />
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Seu e-mail"
        autoComplete="email"
        className="h-12 rounded-2xl border border-emerald-200 bg-white px-4 text-base text-zinc-950 outline-none focus:border-emerald-500"
      />
      <textarea
        value={assunto}
        onChange={(event) => setAssunto(event.target.value)}
        placeholder="Assunto ou dúvida"
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
  );

  return (
    <>
      <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <MessageCircle size={21} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-950">Fale pelo WhatsApp</h3>
            <p className="text-sm text-emerald-800">
              Preencha os dados e fale direto com o suporte oficial.
            </p>
          </div>
        </div>
        <div className="mt-5">{campos}</div>
      </div>

      <button
        type="button"
        onClick={() => setModalAberta(true)}
        aria-label="Abrir suporte pelo WhatsApp"
        className="fixed bottom-5 right-5 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_14px_35px_rgba(5,150,105,0.35)] transition hover:-translate-y-0.5 hover:bg-emerald-700 md:bottom-7 md:right-7"
      >
        <MessageCircle size={27} />
      </button>

      {modalAberta ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-zinc-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Suporte SalãoPremium pelo WhatsApp"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setModalAberta(false);
          }}
        >
          <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <MessageCircle size={21} />
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950">
                  Suporte SalãoPremium
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Informe seus dados e o assunto. Ao continuar, o WhatsApp oficial será aberto com a mensagem pronta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAberta(false)}
                aria-label="Fechar suporte"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100"
              >
                <X size={19} />
              </button>
            </div>
            <div className="mt-5">{campos}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
