"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

export default function CampaignImageUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function chooseFile() {
    inputRef.current?.click();
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 md:col-span-2 xl:col-span-1">
      <input
        ref={inputRef}
        type="file"
        name="imagem_arquivo"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return clearFile();
          if (preview) URL.revokeObjectURL(preview);
          setFileName(file.name);
          setPreview(URL.createObjectURL(file));
        }}
      />

      {preview ? (
        <div className="flex items-center gap-3">
          <img src={preview} alt="Prévia do anúncio" className="h-20 w-16 rounded-xl border border-zinc-200 object-cover" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-zinc-950">{fileName}</div>
            <div className="mt-1 text-xs text-emerald-700">Imagem pronta para enviar</div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={chooseFile} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-black hover:bg-zinc-50">Trocar</button>
              <button type="button" onClick={clearFile} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50"><X size={13} /> Remover</button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={chooseFile}
          className="flex min-h-20 w-full items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 text-left transition hover:border-amber-400 hover:bg-amber-50/40"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white"><ImagePlus size={19} /></span>
          <span>
            <span className="block text-sm font-black text-zinc-950">Enviar imagem</span>
            <span className="mt-1 block text-xs text-zinc-500">JPG, PNG, WEBP ou GIF • até 5 MB</span>
          </span>
        </button>
      )}
    </div>
  );
}
