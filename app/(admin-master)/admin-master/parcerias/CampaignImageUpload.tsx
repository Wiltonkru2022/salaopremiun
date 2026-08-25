"use client";

import { ImagePlus } from "lucide-react";

function resolveCampaignId(button: HTMLButtonElement) {
  const form = button.closest("form");
  if (!form) return "";

  const hidden = form.querySelector<HTMLInputElement>('input[name="id_campanha"]');
  if (hidden?.value) return hidden.value.trim();

  const select = form.querySelector<HTMLSelectElement>('select[name="id_campanha"]');
  return select?.value?.trim() || "";
}

export default function CampaignImageUpload() {
  function openMediaKit(button: HTMLButtonElement) {
    const campaignId = resolveCampaignId(button);
    window.dispatchEvent(
      new CustomEvent("salaopremium:open-media-kit", {
        detail: { campaignId },
      })
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 md:col-span-2 xl:col-span-1">
      <button
        type="button"
        onClick={(event) => openMediaKit(event.currentTarget)}
        className="flex min-h-20 w-full items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 text-left transition hover:border-violet-400 hover:bg-violet-50/50"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white">
          <ImagePlus size={19} />
        </span>
        <span>
          <span className="block text-sm font-black text-zinc-950">Enviar imagem</span>
          <span className="mt-1 block text-xs text-zinc-500">
            Abre o Kit de mídia por posição
          </span>
        </span>
      </button>
    </div>
  );
}
