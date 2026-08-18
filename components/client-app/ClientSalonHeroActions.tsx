"use client";

import { Heart, Share2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toggleClienteSalonFavoriteAction } from "@/app/app-cliente/salao/[id]/actions";

export default function ClientSalonHeroActions({
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
      try {
        await toggleClienteSalonFavoriteAction(formData);
      } catch {
        setFavorite(!nextFavorite);
      }
    });
  }

  return (
    <div className="relative flex gap-3">
      <button
        type="button"
        onClick={() => void shareSalon()}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition active:scale-95"
        aria-label="Compartilhar salão"
      >
        <Share2 size={30} />
      </button>
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={!canFavorite || isPending}
        className={`flex h-16 w-16 items-center justify-center rounded-full bg-black/45 backdrop-blur transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 ${
          favorite ? "text-rose-400" : "text-white"
        }`}
        aria-label={
          canFavorite
            ? favorite
              ? "Remover salão dos favoritos"
              : "Adicionar salão aos favoritos"
            : "Entre na sua conta para favoritar"
        }
      >
        <Heart size={34} fill={favorite ? "currentColor" : "none"} />
      </button>
      {copied ? (
        <span className="absolute right-0 top-[4.5rem] whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-950 shadow-lg">
          Link copiado
        </span>
      ) : null}
    </div>
  );
}
