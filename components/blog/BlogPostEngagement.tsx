"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Send } from "lucide-react";

type Props = {
  postId: string;
  postSlug: string;
};

export default function BlogPostEngagement({ postId, postSlug }: Props) {
  const [progress, setProgress] = useState(0);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const key = "salaopremium-blog-session";
    const current = window.localStorage.getItem(key);
    if (current) return current;
    const next = crypto.randomUUID();
    window.localStorage.setItem(key, next);
    return next;
  }, []);

  useEffect(() => {
    function updateProgress() {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, Math.max(0, (scrollTop / height) * 100)) : 0);
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  useEffect(() => {
    if (!postId || !sessionId) return;
    void fetch("/api/blog/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, sessionId }),
    });
  }, [postId, sessionId]);

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Salvando...");
    const response = await fetch("/api/blog/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, postSlug }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    if (!response.ok) {
      setStatus(payload.message || "Nao foi possivel salvar.");
      return;
    }
    setEmail("");
    setStatus("Pronto. Voce vai receber as novidades do SalaoPremium.");
  }

  return (
    <>
      <div className="fixed left-0 top-0 z-50 h-1 w-full bg-transparent">
        <div className="h-full bg-zinc-950 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <form
        onSubmit={subscribe}
        className="my-8 rounded-[22px] border border-zinc-200 bg-zinc-50 p-5"
      >
        <h2 className="font-display text-2xl font-black text-zinc-950">
          Gostou? Receba novidades do SalaoPremium
        </h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seuemail@exemplo.com"
            className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-950"
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white">
            <Send size={16} />
            Receber
          </button>
        </div>
        {status ? <p className="mt-3 text-sm font-bold text-zinc-600">{status}</p> : null}
      </form>
    </>
  );
}
