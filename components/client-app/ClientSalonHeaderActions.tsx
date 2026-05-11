"use client";

import { useMemo, useState, useTransition } from "react";
import { Heart, Share2 } from "lucide-react";
import { toggleClienteSalonFavoriteAction } from "@/app/app-cliente/salao/[id]/actions";

export default function ClientSalonHeaderActions({
  idSalao,
  salaoNome,
  publicPath,
  initialFavorite,
  canFavorite,
}: {
  idSalao: string;
  salaoNome: string;
  publicPath: string;
  initialFavorite: boolean;
  canFavorite: boolean;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const absoluteUrl = useMemo(() => {
    if (typeof window === "undefined") return publicPath;
    return new URL(publicPath, window.location.origin).toString();
  }, [publicPath]);

  async function shareSalon() {
    setCopied(false);
    try {
      if (navigator.share) {
        await navigator.share({
          title: salaoNome,
          text: `Agende seu horário no ${salaoNome}`,
          url: absoluteUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  function toggleFavorite() {
    if (!canFavorite || isPending) return;
    const nextFavorite = !favorite;
    setFavorite(nextFavorite);

    const formData = new FormData();
    formData.set("salao", idSalao);
    formData.set("next_favorite", String(nextFavorite));

    startTransition(async () => {
      await toggleClienteSalonFavoriteAction(formData);
    });
  }

  return (
    <div className="relative flex gap-3">
      <button
        type="button"
        onClick={shareSalon}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 text-zinc-950 shadow-xl"
        aria-label="Compartilhar salão"
      >
        <Share2 size={22} />
      </button>
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={!canFavorite || isPending}
        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-xl transition ${
          favorite ? "text-rose-600" : "text-zinc-950"
        } disabled:opacity-60`}
        aria-label={favorite ? "Remover dos favoritos" : "Favoritar salão"}
      >
        <Heart size={23} fill={favorite ? "currentColor" : "none"} />
      </button>
      {copied ? (
        <span className="absolute right-0 top-14 rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">
          Link copiado
        </span>
      ) : null}
    </div>
  );
}
