"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

type CampaignRow = {
  id: string;
  nome: string;
  status?: string | null;
  origem?: string | null;
  publico?: string[] | null;
  locais_exibicao?: string[] | null;
};

type AssetRow = {
  id: string;
  id_campanha: string;
  local_exibicao: string;
  imagem_url: string;
  formato?: string | null;
  ativo?: boolean | null;
  atualizado_em?: string | null;
};

type MediaKitPayload = {
  ok?: boolean;
  campanhas?: CampaignRow[];
  artes?: AssetRow[];
  error?: string;
};

const MEDIA_POSITIONS = [
  {
    key: "app_cliente_menu",
    title: "App Cliente — Menu",
    size: "1600 × 1000 px",
    ratio: "16:10",
    description: "Aparece abaixo de Perfil no menu lateral do App Cliente.",
  },
  {
    key: "parceiros",
    title: "Parceiros e Benefícios",
    size: "1600 × 800 px",
    ratio: "2:1",
    description: "Arte horizontal dos cards na área de parceiros e benefícios.",
  },
  {
    key: "app_cliente",
    title: "App Cliente — Popup",
    size: "1080 × 1350 px",
    ratio: "4:5",
    description: "Popup de publicidade exibido no App Cliente.",
  },
  {
    key: "dashboard",
    title: "Painel do Salão — Popup",
    size: "1080 × 1350 px",
    ratio: "4:5",
    description: "Popup de publicidade exibido para o administrador do salão.",
  },
  {
    key: "app_profissional",
    title: "App Profissional",
    size: "1200 × 900 px",
    ratio: "4:3",
    description: "Arte principal do anúncio exibido no App Profissional.",
  },
] as const;

type MediaPosition = (typeof MEDIA_POSITIONS)[number]["key"];

function partnerMediaText() {
  return [
    "Especificações de mídia — Salão Premium",
    "",
    "Para divulgação da campanha, solicitamos as seguintes artes:",
    "1. App Cliente — Menu: 1600 × 1000 px (16:10)",
    "2. Parceiros e Benefícios: 1600 × 800 px (2:1)",
    "3. App Cliente — Popup: 1080 × 1350 px (4:5)",
    "4. Painel do Salão — Popup: 1080 × 1350 px (4:5)",
    "5. App Profissional: 1200 × 900 px (4:3)",
    "",
    "Formatos: JPG, PNG ou WEBP. Até 5 MB por arquivo.",
    "Mantenha logo, produto, oferta e textos importantes dentro dos 80% centrais da arte.",
  ].join("\n");
}

function MediaKitPanel() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [files, setFiles] = useState<Partial<Record<MediaPosition, File>>>({});
  const [busy, setBusy] = useState<MediaPosition | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(
      "/api/admin-master/parcerias/campanhas/criativos-por-local",
      { cache: "no-store" }
    );
    const payload = (await response.json().catch(() => ({}))) as MediaKitPayload;
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "Não foi possível carregar o kit de mídia.");
    }
    setCampaigns(Array.isArray(payload.campanhas) ? payload.campanhas : []);
    setAssets(Array.isArray(payload.artes) ? payload.artes : []);
  }, []);

  useEffect(() => {
    load().catch((loadError) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o kit de mídia."
      );
    });
  }, [load]);

  const currentAssets = useMemo(() => {
    const map = new Map<string, AssetRow>();
    for (const asset of assets) {
      if (asset.id_campanha === selectedCampaign && asset.ativo !== false) {
        map.set(asset.local_exibicao, asset);
      }
    }
    return map;
  }, [assets, selectedCampaign]);

  async function upload(position: MediaPosition) {
    if (!selectedCampaign) {
      setError("Escolha uma campanha antes de enviar as artes.");
      return;
    }
    const file = files[position];
    if (!file) {
      setError("Escolha a imagem desta posição.");
      return;
    }

    setBusy(position);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.set("id_campanha", selectedCampaign);
      formData.set("local_exibicao", position);
      formData.set("imagem_arquivo", file);

      const response = await fetch(
        "/api/admin-master/parcerias/campanhas/criativos-por-local",
        {
          method: "POST",
          body: formData,
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Não foi possível enviar a arte.");
      }

      setFiles((current) => {
        const next = { ...current };
        delete next[position];
        return next;
      });
      await load();
      setMessage("Arte salva. Esta posição já usará a imagem específica.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar a arte."
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove(position: MediaPosition) {
    if (!selectedCampaign) return;
    if (
      !window.confirm(
        "Remover a arte específica desta posição? A arte padrão voltará a ser usada como fallback."
      )
    ) {
      return;
    }

    setBusy(position);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/admin-master/parcerias/campanhas/criativos-por-local",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idCampanha: selectedCampaign,
            localExibicao: position,
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Não foi possível remover a arte.");
      }
      await load();
      setMessage("Arte específica removida. O sistema voltou ao criativo padrão.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Não foi possível remover a arte."
      );
    } finally {
      setBusy(null);
    }
  }

  async function copySpecs() {
    try {
      await navigator.clipboard.writeText(partnerMediaText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Não foi possível copiar. Selecione o texto manualmente.");
    }
  }

  const selected = campaigns.find(
    (campaign) => campaign.id === selectedCampaign
  );

  return (
    <div className="mt-6 rounded-[24px] border border-violet-200 bg-violet-50/40 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
            Kit de mídia por posição
          </div>
          <h3 className="mt-2 text-xl font-black text-zinc-950">
            Uma arte certa para cada lugar do sistema
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Envie uma imagem específica para cada posição. Se alguma ficar vazia,
            o sistema continua usando o anúncio padrão como fallback.
          </p>
        </div>
        <button
          type="button"
          onClick={copySpecs}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-violet-200 bg-white px-4 text-xs font-black text-violet-800 transition hover:bg-violet-100"
        >
          {copied
            ? "Especificações copiadas"
            : "Copiar especificações para parceiro"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,420px)_1fr] lg:items-end">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
            Campanha
          </span>
          <select
            value={selectedCampaign}
            onChange={(event) => {
              setSelectedCampaign(event.target.value);
              setMessage("");
              setError("");
            }}
            className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          >
            <option value="">Escolha uma campanha</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.origem === "salao_premium"
                  ? "Salão Premiun"
                  : "Parceiro"}{" "}
                • {campaign.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs leading-5 text-zinc-600">
          {selected ? (
            <>
              <b className="text-zinc-900">{selected.nome}</b>
              <span className="mx-2 text-zinc-300">•</span>
              Status: <b>{selected.status || "—"}</b>
              <br />
              Ative também os locais desejados na configuração da campanha. A
              arte específica só aparece onde a campanha estiver habilitada.
            </>
          ) : (
            "Selecione a campanha para enviar ou substituir as imagens."
          )}
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {MEDIA_POSITIONS.map((position) => {
          const asset = currentAssets.get(position.key);
          const file = files[position.key];
          const isBusy = busy === position.key;

          return (
            <article
              key={position.key}
              className="overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-sm"
            >
              <div className="grid gap-4 p-4 sm:grid-cols-[150px_1fr]">
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                  {asset?.imagem_url ? (
                    <img
                      src={asset.imagem_url}
                      alt={position.title}
                      className="aspect-[4/3] h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center p-4 text-center text-xs font-black text-zinc-400">
                      Arte específica ainda não enviada
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-black text-zinc-950">
                    {position.title}
                  </div>
                  <div className="mt-1 text-lg font-black text-violet-700">
                    {position.size}
                  </div>
                  <div className="mt-1 text-xs font-bold text-zinc-500">
                    Proporção {position.ratio} • JPG, PNG ou WEBP • até 5 MB
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {position.description}
                  </p>
                  <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-4 text-amber-900">
                    Área segura: mantenha textos, logos e produtos importantes nos
                    80% centrais.
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-100 p-4">
                <input
                  key={`${position.key}:${asset?.id || "empty"}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!selectedCampaign || isBusy}
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0];
                    setFiles((current) => ({
                      ...current,
                      [position.key]: selectedFile || undefined,
                    }));
                  }}
                  className="block w-full text-xs font-semibold text-zinc-600 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => upload(position.key)}
                    disabled={!selectedCampaign || !file || isBusy}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-violet-700 px-4 text-xs font-black text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isBusy
                      ? "Salvando..."
                      : asset
                        ? "Substituir arte"
                        : "Enviar arte"}
                  </button>

                  {asset ? (
                    <button
                      type="button"
                      onClick={() => remove(position.key)}
                      disabled={isBusy}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-40"
                    >
                      Remover específica
                    </button>
                  ) : null}

                  <span className="text-[11px] font-bold text-zinc-400">
                    {asset ? "✓ Arte específica ativa" : "Usando fallback padrão"}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminCampaignMediaKit() {
  const pathname = usePathname();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (pathname !== "/admin-master/parcerias") {
      setPortalTarget(null);
      return;
    }

    let cancelled = false;

    const attachPortal = () => {
      const target = document.querySelector<HTMLElement>("#anuncios");
      if (target && !cancelled) setPortalTarget(target);
      return Boolean(target);
    };

    if (!attachPortal()) {
      const observer = new MutationObserver(() => {
        if (attachPortal()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        cancelled = true;
        observer.disconnect();
      };
    }

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname !== "/admin-master/parcerias" || !portalTarget) return null;

  return createPortal(<MediaKitPanel />, portalTarget);
}
