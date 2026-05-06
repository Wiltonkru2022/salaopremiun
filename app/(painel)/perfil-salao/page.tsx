"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  Globe,
  LifeBuoy,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import AppLoading from "@/components/ui/AppLoading";
import AppModal from "@/components/ui/AppModal";
import { Field, SectionCard, TextInput } from "@/components/configuracoes/ui";
import { EMPTY_SALAO } from "@/components/configuracoes/constants";
import type { SalaoForm } from "@/components/configuracoes/types";
import { getPlanoCatalogo } from "@/lib/plans/catalog";
import { createClient } from "@/lib/supabase/client";

type PasswordForm = {
  novaSenha: string;
  confirmarSenha: string;
  codigoTotp: string;
  backupCode: string;
};

type ModalKey =
  | "comercial"
  | "endereco"
  | "senha"
  | "autenticador"
  | "app_cliente"
  | null;

type TotpFactor = {
  id: string;
  factor_type?: string;
  friendly_name?: string | null;
  status?: string;
};

type MfaSnapshot = {
  factorActive: boolean;
  currentLevel: "aal1" | "aal2" | null;
  backupCodesRemaining: number;
  backupCodesLockedUntil: string | null;
  backupCodesGeneratedAt: string | null;
  backupCodesLastUsedAt: string | null;
  sensitiveActionLockedUntil: string | null;
};

type TotpSetupState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type SalaoProfileRow = {
  id?: string | null;
  nome?: string | null;
  responsavel?: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  logo_url?: string | null;
  plano?: string | null;
  status?: string | null;
  descricao_publica?: string | null;
  foto_capa_url?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  estacionamento?: boolean | null;
  formas_pagamento_publico?: string[] | string | null;
  app_cliente_publicado?: boolean | null;
};

const EMPTY_PASSWORD: PasswordForm = {
  novaSenha: "",
  confirmarSenha: "",
  codigoTotp: "",
  backupCode: "",
};

const EMPTY_MFA_SNAPSHOT: MfaSnapshot = {
  factorActive: false,
  currentLevel: null,
  backupCodesRemaining: 0,
  backupCodesLockedUntil: null,
  backupCodesGeneratedAt: null,
  backupCodesLastUsedAt: null,
  sensitiveActionLockedUntil: null,
};

function formatAddress(form: SalaoForm) {
  const linha1 = [form.endereco, form.numero].filter(Boolean).join(", ");
  const linha2 = [form.bairro, form.cidade, form.estado, form.cep]
    .filter(Boolean)
    .join(" | ");

  return [linha1, linha2].filter(Boolean);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Nao registrado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nao registrado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatPaymentMethods(value: string | null | undefined) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function serializePaymentMethods(value: string | null | undefined) {
  return formatPaymentMethods(value).join(", ");
}

function parseCoordinate(value: string | null | undefined) {
  const normalized = String(value || "").trim().replace(",", ".");
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function extractGoogleMapsCoordinates(value: string) {
  const text = value.trim();
  if (!text) return null;

  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const dataMatch = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const queryMatch = text.match(/[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const plainMatch = text.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  const match = atMatch || dataMatch || queryMatch || plainMatch;

  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  return {
    latitude: latitude.toFixed(7),
    longitude: longitude.toFixed(7),
  };
}

function formatMapPoint(latitude?: string, longitude?: string) {
  const lat = String(latitude || "").trim();
  const lng = String(longitude || "").trim();
  return lat && lng ? "Ponto do mapa configurado" : "Usando endereco do salao";
}

function buildAddressQuery(form: SalaoForm) {
  return [
    [form.endereco, form.numero].filter(Boolean).join(", "),
    form.bairro,
    form.cidade,
    form.estado,
    form.cep,
    "Brasil",
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");
}

function MapLocationPicker({
  latitude,
  longitude,
  addressQuery,
  onChange,
}: {
  latitude?: string;
  longitude?: string;
  addressQuery: string;
  onChange: (coords: { latitude: string; longitude: string }) => void;
}) {
  const [loadingMap, setLoadingMap] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const currentLat = parseCoordinate(latitude) ?? -23.55052;
  const currentLng = parseCoordinate(longitude) ?? -46.633308;
  const hasCoords =
    parseCoordinate(latitude) !== null && parseCoordinate(longitude) !== null;
  const googleQuery = hasCoords
    ? `${currentLat.toFixed(7)},${currentLng.toFixed(7)}`
    : addressQuery || "Brasil";
  const googleEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    googleQuery
  )}&z=17&output=embed`;
  const googleOpenUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    googleQuery
  )}`;

  const buscarEndereco = useCallback(async () => {
    if (!addressQuery) {
      setLookupMessage("Preencha o endereco do salao antes de buscar no mapa.");
      return;
    }

    try {
      setLookupMessage("");
      setLoadingMap(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          addressQuery
        )}`
      );
      const data = (await response.json()) as Array<{
        lat?: string;
        lon?: string;
      }>;
      const nextLat = parseCoordinate(data[0]?.lat);
      const nextLng = parseCoordinate(data[0]?.lon);

      if (nextLat !== null && nextLng !== null) {
        onChange({
          latitude: nextLat.toFixed(7),
          longitude: nextLng.toFixed(7),
        });
        setLookupMessage(
          "Mapa ajustado pelo endereco cadastrado. Confira no Google Maps antes de salvar."
        );
      } else {
        setLookupMessage(
          "Nao encontrei esse endereco automaticamente. Abra no Google Maps e confira o cadastro."
        );
      }
    } catch {
      setLookupMessage(
        "Nao foi possivel buscar o endereco agora. O mapa do Google continua disponivel para conferencia."
      );
    } finally {
      setLoadingMap(false);
    }
  }, [addressQuery, onChange]);

  function usarLinkGoogleMaps() {
    const coords = extractGoogleMapsCoordinates(googleMapsLink);

    if (!coords) {
      setLookupMessage(
        "Cole um link do Google Maps com o ponto marcado, ou copie as coordenadas no formato -20.123456, -51.123456."
      );
      return;
    }

    onChange(coords);
    setLookupMessage(
      "Ponto atualizado pelo link do Google Maps. Confira o mapa antes de salvar."
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function localizarEnderecoInicial() {
      let initialLat = parseCoordinate(latitude);
      let initialLng = parseCoordinate(longitude);

      if (initialLat !== null && initialLng !== null) return;
      if (!addressQuery) return;

      try {
        setLookupMessage("");
        setLoadingMap(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
            addressQuery
          )}`
        );
        const data = (await response.json()) as Array<{
          lat?: string;
          lon?: string;
        }>;

        if (cancelled) return;

        initialLat = parseCoordinate(data[0]?.lat);
        initialLng = parseCoordinate(data[0]?.lon);

        if (initialLat !== null && initialLng !== null) {
          onChange({
            latitude: initialLat.toFixed(7),
            longitude: initialLng.toFixed(7),
          });
        } else {
          setLookupMessage(
            "Endereco nao encontrado automaticamente. Confira a busca no Google Maps."
          );
        }
      } catch {
        if (!cancelled) {
          setLookupMessage(
            "Nao foi possivel buscar o endereco agora. Confira a busca no Google Maps."
          );
        }
      } finally {
        if (!cancelled) setLoadingMap(false);
      }
    }

    void localizarEnderecoInicial();

    return () => {
      cancelled = true;
    };
  }, [addressQuery, latitude, longitude, onChange]);

  return (
    <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-zinc-950">
            Localizacao no mapa
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            O mapa abre com o endereco cadastrado. Ajuste pelo endereco e confira
            as ruas no Google Maps antes de salvar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={buscarEndereco}
            disabled={loadingMap}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {loadingMap ? <Loader2 className="animate-spin" size={14} /> : null}
            Buscar endereco
          </button>
          <a
            href={googleOpenUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700"
          >
            Abrir no Google Maps
          </a>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-[20px] border border-zinc-200 bg-white">
        <iframe
          title="Mapa do salao no Google Maps"
          src={googleEmbedUrl}
          className="h-[360px] w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="mt-4 rounded-[20px] border border-zinc-200 bg-white p-3">
        <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
          Ponto exato pelo Google Maps
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={googleMapsLink}
            onChange={(event) => setGoogleMapsLink(event.target.value)}
            placeholder="Cole o link do ponto marcado no Google Maps"
            className="min-h-11 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-100"
          />
          <button
            type="button"
            onClick={usarLinkGoogleMaps}
            className="rounded-2xl border border-zinc-950 bg-white px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-zinc-950 hover:text-white"
          >
            Usar ponto
          </button>
        </div>
      </div>
      {lookupMessage ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {lookupMessage}
        </div>
      ) : null}
    </div>
  );
}

function DisplayItem({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div
        className={`text-sm text-zinc-900 ${multiline ? "leading-6" : "break-words"}`}
      >
        {value}
      </div>
    </div>
  );
}

function SidebarAction({
  icon,
  title,
  description,
  onClick,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  tone?: "default" | "security";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 ${
        tone === "security"
          ? "border-[rgba(199,162,92,0.35)] bg-[rgba(199,162,92,0.10)]"
          : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-2xl border p-2.5 ${
            tone === "security"
              ? "border-[rgba(199,162,92,0.35)] bg-white text-zinc-900"
              : "border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-zinc-950">{title}</div>
          <div className="mt-1 text-sm leading-5 text-zinc-600">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function PerfilSalaoPage() {
  const supabase = createClient();
  const router = useRouter();
  const { snapshot: painelSession } = usePainelSession();

  const [loading, setLoading] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);
  const [uploadingPublicAsset, setUploadingPublicAsset] = useState<
    "logo" | "capa" | null
  >(null);
  const [loadingMfa, setLoadingMfa] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [creatingRecoveryTicket, setCreatingRecoveryTicket] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [perfilForm, setPerfilForm] = useState<SalaoForm>(EMPTY_SALAO);
  const [comercialDraft, setComercialDraft] = useState<SalaoForm>(EMPTY_SALAO);
  const [enderecoDraft, setEnderecoDraft] = useState<SalaoForm>(EMPTY_SALAO);
  const [appClienteDraft, setAppClienteDraft] =
    useState<SalaoForm>(EMPTY_SALAO);
  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(EMPTY_PASSWORD);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [totpFactor, setTotpFactor] = useState<TotpFactor | null>(null);
  const [mfaSnapshot, setMfaSnapshot] = useState<MfaSnapshot>(EMPTY_MFA_SNAPSHOT);
  const [totpSetup, setTotpSetup] = useState<TotpSetupState | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [manageCode, setManageCode] = useState("");
  const [disableBackupCode, setDisableBackupCode] = useState("");
  const [revealedBackupCodes, setRevealedBackupCodes] = useState<string[]>([]);

  const linhasEndereco = useMemo(() => formatAddress(perfilForm), [perfilForm]);
  const metodosPagamento = useMemo(
    () => formatPaymentMethods(perfilForm.formas_pagamento_publico),
    [perfilForm.formas_pagamento_publico]
  );
  const planoPremium = useMemo(
    () => getPlanoCatalogo(perfilForm.plano).codigo === "premium",
    [perfilForm.plano]
  );
  const autenticadorAtivo = Boolean(totpFactor?.id);
  const qrCodeMarkup = useMemo(() => {
    if (!totpSetup?.qrCode) return "";
    return totpSetup.qrCode.trim().startsWith("<svg") ? totpSetup.qrCode : "";
  }, [totpSetup]);

  const qrCodeDataUrl = useMemo(() => {
    if (!totpSetup?.qrCode || qrCodeMarkup) return "";
    return totpSetup.qrCode.startsWith("data:image")
      ? totpSetup.qrCode
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(totpSetup.qrCode)}`;
  }, [qrCodeMarkup, totpSetup]);

  const appClienteAddressQuery = useMemo(
    () => buildAddressQuery(appClienteDraft),
    [appClienteDraft]
  );

  const updateAppClienteMapLocation = useCallback(
    (coords: { latitude: string; longitude: string }) => {
      setAppClienteDraft((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
    },
    []
  );

  const callMfaApi = useCallback(
    async (body?: Record<string, unknown>) => {
      const response = await fetch("/api/auth/mfa", {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        [key: string]: unknown;
      };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Erro ao processar autenticador.");
      }

      return payload;
    },
    []
  );

  const carregarMfa = useCallback(async () => {
    try {
      setLoadingMfa(true);

      const [
        { data: factorData, error: factorError },
        { data: aalData },
        snapshot,
      ] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        callMfaApi(),
      ]);

      if (factorError) throw factorError;

      const fator = (factorData?.totp?.[0] ?? null) as TotpFactor | null;
      setTotpFactor(fator);
      setMfaSnapshot({
        factorActive: Boolean(snapshot.factorActive),
        currentLevel:
          (aalData?.currentLevel as "aal1" | "aal2" | null | undefined) ??
          null,
        backupCodesRemaining: Number(snapshot.backupCodesRemaining || 0),
        backupCodesLockedUntil:
          String(snapshot.backupCodesLockedUntil || "") || null,
        backupCodesGeneratedAt:
          String(snapshot.backupCodesGeneratedAt || "") || null,
        backupCodesLastUsedAt:
          String(snapshot.backupCodesLastUsedAt || "") || null,
        sensitiveActionLockedUntil:
          String(snapshot.sensitiveActionLockedUntil || "") || null,
      });
    } catch (error) {
      console.warn("Nao foi possivel carregar status do autenticador:", error);
      setTotpFactor(null);
      setMfaSnapshot(EMPTY_MFA_SNAPSHOT);
    } finally {
      setLoadingMfa(false);
    }
  }, [callMfaApi, supabase]);

  const carregarPerfil = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setMsg("");
      setSemPermissao(false);

      if (!painelSession?.idSalao || !painelSession?.permissoes) {
        setErro("Nao foi possivel identificar o salao da conta atual.");
        return;
      }

      if (!painelSession.permissoes.perfil_salao_ver) {
        setSemPermissao(true);
        return;
      }

      setIdSalao(painelSession.idSalao);

      const { data, error } = await supabase
        .from("saloes")
        .select(
          "id, nome, responsavel, email, telefone, cpf_cnpj, endereco, numero, bairro, cidade, estado, cep, logo_url, plano, status, descricao_publica, foto_capa_url, latitude, longitude, estacionamento, formas_pagamento_publico, app_cliente_publicado"
        )
        .eq("id", painelSession.idSalao)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const row = data as SalaoProfileRow;
        const nextForm: SalaoForm = {
          id: row.id || "",
          nome: row.nome || "",
          responsavel: row.responsavel || "",
          email: row.email || "",
          telefone: row.telefone || "",
          cpf_cnpj: row.cpf_cnpj || "",
          endereco: row.endereco || "",
          numero: row.numero || "",
          bairro: row.bairro || "",
          cidade: row.cidade || "",
          estado: row.estado || "",
          cep: row.cep || "",
          logo_url: row.logo_url || "",
          plano: row.plano || "",
          status: row.status || "",
          descricao_publica: row.descricao_publica || "",
          foto_capa_url: row.foto_capa_url || "",
          latitude:
            row.latitude === null || row.latitude === undefined
              ? ""
              : String(row.latitude),
          longitude:
            row.longitude === null || row.longitude === undefined
              ? ""
              : String(row.longitude),
          estacionamento: Boolean(row.estacionamento),
          formas_pagamento_publico: serializePaymentMethods(
            Array.isArray(row.formas_pagamento_publico)
              ? row.formas_pagamento_publico.join(", ")
              : row.formas_pagamento_publico
          ),
          app_cliente_publicado: Boolean(row.app_cliente_publicado),
        };

        setPerfilForm(nextForm);
        setComercialDraft(nextForm);
        setEnderecoDraft(nextForm);
        setAppClienteDraft(nextForm);
      }

      await carregarMfa();
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar perfil."
      );
    } finally {
      setLoading(false);
    }
  }, [carregarMfa, supabase, painelSession]);

  useEffect(() => {
    void carregarPerfil();
  }, [carregarPerfil]);

  async function fecharModalAutenticador() {
    if (totpSetup?.factorId && !autenticadorAtivo) {
      try {
        await supabase.auth.mfa.unenroll({
          factorId: totpSetup.factorId,
        });
      } catch (error) {
        console.warn("Nao foi possivel limpar enrolamento pendente:", error);
      }
    }

    setTotpSetup(null);
    setSetupCode("");
    setManageCode("");
    setDisableBackupCode("");
    setRevealedBackupCodes([]);
    setActiveModal(null);
  }

  function abrirModal(modal: Exclude<ModalKey, null>) {
    setErro("");
    setMsg("");

    if (modal === "comercial") {
      setComercialDraft(perfilForm);
    }

    if (modal === "endereco") {
      setEnderecoDraft(perfilForm);
    }

    if (modal === "senha") {
      setPasswordForm(EMPTY_PASSWORD);
    }

    if (modal === "app_cliente") {
      setAppClienteDraft(perfilForm);
    }

    if (modal === "autenticador") {
      setSetupCode("");
      setManageCode("");
      setDisableBackupCode("");
      setRevealedBackupCodes([]);
    }

    setActiveModal(modal);
  }

  async function atualizarPerfil(patch: Partial<SalaoForm>, sucesso: string) {
    if (!idSalao) return false;

    try {
      setSavingPerfil(true);
      setErro("");
      setMsg("");

      const payload = {
        nome: patch.nome ?? perfilForm.nome,
        responsavel: (patch.responsavel ?? perfilForm.responsavel) || null,
        email: (patch.email ?? perfilForm.email) || null,
        telefone: (patch.telefone ?? perfilForm.telefone) || null,
        cpf_cnpj: (patch.cpf_cnpj ?? perfilForm.cpf_cnpj) || null,
        endereco: (patch.endereco ?? perfilForm.endereco) || null,
        numero: (patch.numero ?? perfilForm.numero) || null,
        bairro: (patch.bairro ?? perfilForm.bairro) || null,
        cidade: (patch.cidade ?? perfilForm.cidade) || null,
        estado: (patch.estado ?? perfilForm.estado) || null,
        cep: (patch.cep ?? perfilForm.cep) || null,
        logo_url: (patch.logo_url ?? perfilForm.logo_url) || null,
        descricao_publica:
          (patch.descricao_publica ?? perfilForm.descricao_publica) || null,
        foto_capa_url:
          (patch.foto_capa_url ?? perfilForm.foto_capa_url) || null,
        latitude: parseCoordinate(patch.latitude ?? perfilForm.latitude),
        longitude: parseCoordinate(patch.longitude ?? perfilForm.longitude),
        estacionamento: Boolean(
          patch.estacionamento ?? perfilForm.estacionamento
        ),
        formas_pagamento_publico: formatPaymentMethods(
          patch.formas_pagamento_publico ?? perfilForm.formas_pagamento_publico
        ),
        app_cliente_publicado: planoPremium
          ? Boolean(
              patch.app_cliente_publicado ?? perfilForm.app_cliente_publicado
            )
          : false,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("saloes")
        .update(payload)
        .eq("id", idSalao);

      if (error) throw error;

      const nextForm = { ...perfilForm, ...patch };
      setPerfilForm(nextForm);
      setComercialDraft(nextForm);
      setEnderecoDraft(nextForm);
      setAppClienteDraft(nextForm);
      setMsg(sucesso);
      setActiveModal(null);
      router.refresh();
      return true;
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao salvar perfil."
      );
      return false;
    } finally {
      setSavingPerfil(false);
    }
  }

  async function uploadImagemPublica(
    file: File | undefined,
    tipo: "logo" | "capa",
    destino: "draft" | "perfil" = "draft"
  ) {
    if (!file || !idSalao) return;

    if (!file.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErro("A imagem precisa ter ate 5MB.");
      return;
    }

    try {
      setErro("");
      setUploadingPublicAsset(tipo);

      const body = new FormData();
      body.set("file", file);
      body.set("tipo", tipo);

      const response = await fetch("/api/painel/salao-public-assets", {
        method: "POST",
        body,
      });
      const result = (await response.json().catch(() => null)) as {
        publicUrl?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(result?.message || "Nao foi possivel enviar a imagem.");
      }

      if (!result?.publicUrl) {
        throw new Error("Nao foi possivel obter a URL publica da imagem.");
      }

      const patch =
        tipo === "logo"
          ? { logo_url: result.publicUrl }
          : { foto_capa_url: result.publicUrl };

      if (destino === "perfil") {
        await atualizarPerfil(
          patch,
          tipo === "logo"
            ? "Foto do perfil atualizada com sucesso."
            : "Foto de capa atualizada com sucesso."
        );
        return;
      }

      setAppClienteDraft((prev) => ({
        ...prev,
        ...patch,
      }));
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar a imagem."
      );
    } finally {
      setUploadingPublicAsset(null);
    }
  }

  async function salvarDadosComerciais() {
    await atualizarPerfil(
      {
        nome: comercialDraft.nome,
        responsavel: comercialDraft.responsavel,
        email: comercialDraft.email,
        telefone: comercialDraft.telefone,
        cpf_cnpj: comercialDraft.cpf_cnpj,
      },
      "Dados comerciais atualizados com sucesso."
    );
  }

  async function salvarEndereco() {
    await atualizarPerfil(
      {
        endereco: enderecoDraft.endereco,
        numero: enderecoDraft.numero,
        bairro: enderecoDraft.bairro,
        cidade: enderecoDraft.cidade,
        estado: enderecoDraft.estado,
        cep: enderecoDraft.cep,
      },
      "Endereco do salao atualizado com sucesso."
    );
  }

  async function salvarPerfilPublico() {
    await atualizarPerfil(
      {
        descricao_publica: appClienteDraft.descricao_publica || "",
        foto_capa_url: appClienteDraft.foto_capa_url || "",
        logo_url: appClienteDraft.logo_url || "",
        latitude: appClienteDraft.latitude || "",
        longitude: appClienteDraft.longitude || "",
        estacionamento: Boolean(appClienteDraft.estacionamento),
        formas_pagamento_publico:
          appClienteDraft.formas_pagamento_publico || "",
        app_cliente_publicado: planoPremium
          ? Boolean(appClienteDraft.app_cliente_publicado)
          : false,
      },
      planoPremium
        ? "Perfil publico do app cliente atualizado com sucesso."
        : "Perfil publico salvo. A publicacao fica disponivel quando o salao estiver no Premium."
    );
  }

  async function verificarTotpCode(
    code: string,
    factorId = totpFactor?.id || ""
  ) {
    if (!factorId) {
      throw new Error("Nenhum autenticador ativo foi encontrado.");
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId,
      });

    if (challengeError) {
      throw challengeError;
    }

    const challengeId = (challengeData as { id?: string } | null)?.id || "";

    if (!challengeId) {
      throw new Error("Nao foi possivel iniciar a verificacao do autenticador.");
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    });

    if (verifyError) {
      throw verifyError;
    }
  }

  async function validarSegundoFatorParaSenha() {
    if (!totpFactor?.id) return true;

    if (passwordForm.codigoTotp.trim()) {
      await verificarTotpCode(passwordForm.codigoTotp.trim());
      return true;
    }

    if (passwordForm.backupCode.trim()) {
      await callMfaApi({
        action: "consume_backup_code",
        backupCode: passwordForm.backupCode.trim(),
      });
      await carregarMfa();
      return true;
    }

    setErro("Informe o codigo do autenticador ou um backup code.");
    return false;
  }

  async function trocarSenha() {
    try {
      setSavingSenha(true);
      setErro("");
      setMsg("");

      if (passwordForm.novaSenha.length < 6) {
        setErro("A nova senha precisa ter pelo menos 6 caracteres.");
        return;
      }

      if (passwordForm.novaSenha !== passwordForm.confirmarSenha) {
        setErro("A confirmacao da senha nao confere.");
        return;
      }

      if (mfaSnapshot.sensitiveActionLockedUntil) {
        setErro(
          `Por seguranca, alteracoes sensiveis ficam bloqueadas ate ${formatDateTime(
            mfaSnapshot.sensitiveActionLockedUntil
          )} depois da recuperacao do autenticador.`
        );
        return;
      }

      const podeSeguir = await validarSegundoFatorParaSenha();
      if (!podeSeguir) return;

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.novaSenha,
      });

      if (error) throw error;

      setPasswordForm(EMPTY_PASSWORD);
      setMsg("Senha da conta administradora atualizada com sucesso.");
      setActiveModal(null);
      await carregarMfa();
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Erro ao trocar senha.");
    } finally {
      setSavingSenha(false);
    }
  }

  async function prepararAutenticador() {
    try {
      setMfaBusy(true);
      setErro("");
      setMsg("");
      setRevealedBackupCodes([]);

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Administrador ${perfilForm.nome || "SalaoPremium"}`,
      });

      if (error) throw error;

      const payload = data as {
        id?: string;
        totp?: { qr_code?: string; secret?: string };
      } | null;

      if (!payload?.id || !payload.totp?.qr_code || !payload.totp?.secret) {
        throw new Error("Nao foi possivel preparar o autenticador.");
      }

      setTotpSetup({
        factorId: payload.id,
        qrCode: payload.totp.qr_code,
        secret: payload.totp.secret,
      });
      setSetupCode("");
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao preparar o autenticador."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function concluirAtivacaoAutenticador() {
    try {
      if (!totpSetup?.factorId) {
        setErro("Nenhum preparo de autenticador ativo foi encontrado.");
        return;
      }

      if (setupCode.trim().length < 6) {
        setErro("Informe o codigo de 6 digitos do autenticador.");
        return;
      }

      setMfaBusy(true);
      setErro("");
      setMsg("");

      await verificarTotpCode(setupCode.trim(), totpSetup.factorId);

      const response = await callMfaApi({
        action: "generate_backup_codes",
      });

      setRevealedBackupCodes(
        Array.isArray(response.codes)
          ? response.codes.map((value) => String(value))
          : []
      );
      setTotpSetup(null);
      setSetupCode("");
      setMsg("Autenticador ativado com sucesso.");
      await carregarMfa();
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao ativar o autenticador."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function regenerarBackupCodes() {
    try {
      if (!manageCode.trim()) {
        setErro("Informe o codigo atual do autenticador para gerar novos backup codes.");
        return;
      }

      setMfaBusy(true);
      setErro("");
      setMsg("");

      await verificarTotpCode(manageCode.trim());
      const response = await callMfaApi({
        action: "generate_backup_codes",
      });

      setRevealedBackupCodes(
        Array.isArray(response.codes)
          ? response.codes.map((value) => String(value))
          : []
      );
      setManageCode("");
      setMsg("Novos backup codes gerados.");
      await carregarMfa();
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao gerar novos backup codes."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function desativarAutenticadorPorTotp() {
    try {
      if (!manageCode.trim()) {
        setErro("Informe o codigo atual do autenticador para desativar.");
        return;
      }

      setMfaBusy(true);
      setErro("");
      setMsg("");

      await verificarTotpCode(manageCode.trim());
      await callMfaApi({
        action: "disable_factor",
        method: "aal2",
      });

      await supabase.auth.signOut();
      router.push("/login?motivo=autenticador_desativado");
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao desativar o autenticador."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function desativarAutenticadorPorBackupCode() {
    try {
      if (!disableBackupCode.trim()) {
        setErro("Informe um backup code valido para desativar.");
        return;
      }

      setMfaBusy(true);
      setErro("");
      setMsg("");

      await callMfaApi({
        action: "disable_factor",
        method: "backup_code",
        backupCode: disableBackupCode.trim(),
      });

      await supabase.auth.signOut();
      router.push("/login?motivo=autenticador_desativado");
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao desativar o autenticador."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function abrirRecuperacaoAutenticador() {
    try {
      setCreatingRecoveryTicket(true);
      setErro("");
      setMsg("");

      const response = await fetch("/api/auth/mfa/recovery-request", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        ticket?: { id?: string; numero?: number | string };
        recoveryCode?: string;
        delayHours?: number;
      };

      if (!response.ok || payload.ok === false || !payload.ticket?.id) {
        throw new Error(
          payload.error || "Nao foi possivel abrir a recuperacao do autenticador."
        );
      }

      const numero = payload.ticket.numero ? `#${payload.ticket.numero}` : "novo ticket";
      const code = payload.recoveryCode ? ` (${payload.recoveryCode})` : "";
      setMsg(
        `Recuperacao iniciada no ticket ${numero}${code}. O processo pode levar ate ${payload.delayHours || 24} horas por seguranca.`
      );
      fecharModalAutenticador();
      router.push(`/suporte?ticket=${payload.ticket.id}&recovery=1`);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao abrir recuperacao do autenticador."
      );
    } finally {
      setCreatingRecoveryTicket(false);
    }
  }

  if (loading) {
    return (
      <AppLoading
        title="Carregando perfil do salao"
        message="Aguarde enquanto reunimos identidade do negocio, contatos e seguranca da conta."
        fullHeight={false}
      />
    );
  }

  if (semPermissao) {
    return (
      <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-amber-800">
        Apenas administradores podem editar o perfil do salao.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white text-zinc-950 shadow-sm">
          <label className="group relative block h-56 cursor-pointer bg-zinc-100 md:h-72">
            {perfilForm.foto_capa_url ? (
              <img
                src={perfilForm.foto_capa_url}
                alt="Foto de capa do salao"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full bg-gradient-to-br from-zinc-950 via-zinc-800 to-amber-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent transition group-hover:bg-black/25" />
            <div className="absolute bottom-5 right-5 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-zinc-950 shadow-sm">
              {uploadingPublicAsset === "capa" ? "Enviando..." : "Trocar capa"}
            </div>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) =>
                void uploadImagemPublica(
                  event.target.files?.[0],
                  "capa",
                  "perfil"
                )
              }
            />
          </label>

          <div className="relative p-5 pt-0">
            <label className="group relative -mt-14 flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-[26px] border-4 border-white bg-zinc-100 text-4xl font-black text-zinc-950 shadow-xl">
              {perfilForm.logo_url ? (
                <img
                  src={perfilForm.logo_url}
                  alt={perfilForm.nome || "Salao"}
                  className="h-full w-full object-cover"
                />
              ) : (
                (perfilForm.nome || "SP").slice(0, 2).toUpperCase()
              )}
              <span className="absolute hidden rounded-xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white group-hover:block">
                {uploadingPublicAsset === "logo" ? "Enviando" : "Trocar"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) =>
                  void uploadImagemPublica(
                    event.target.files?.[0],
                    "logo",
                    "perfil"
                  )
                }
              />
            </label>

            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                  <Building2 size={13} />
                  Identidade do negocio
                </div>
                <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.05em] sm:text-[2.1rem]">
                  Perfil do salao
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500 sm:text-[15px]">
                  Confira os dados do negocio em um lugar so. Clique na capa ou
                  na foto do perfil para atualizar a vitrine visual do app cliente.
                </p>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-3.5">
                <div className="font-display text-lg font-bold">
                  {perfilForm.nome || "SalaoPremium"}
                </div>
                <div className="text-sm text-zinc-500">
                  {String(perfilForm.plano || "sem plano").toUpperCase()} |{" "}
                  {perfilForm.status || "status nao definido"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {erro ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erro}
          </div>
        ) : null}

        {msg ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            {msg}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="space-y-4">
            <SectionCard
              icon={<Building2 size={18} />}
              title="Dados comerciais"
              description="Leitura principal da identidade do negocio e dos contatos usados no painel."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DisplayItem
                  label="Nome do salao"
                  value={perfilForm.nome || "Nao informado"}
                />
                <DisplayItem
                  label="Responsavel"
                  value={perfilForm.responsavel || "Nao informado"}
                />
                <DisplayItem
                  label="E-mail"
                  value={perfilForm.email || "Nao informado"}
                />
                <DisplayItem
                  label="Telefone"
                  value={perfilForm.telefone || "Nao informado"}
                />
                <DisplayItem
                  label="CPF/CNPJ"
                  value={perfilForm.cpf_cnpj || "Nao informado"}
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={<MapPin size={18} />}
              title="Endereco"
              description="Base de localizacao usada em fichas, impressos e referencias do salao."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <DisplayItem
                    label="Endereco principal"
                    value={linhasEndereco[0] || "Nao informado"}
                  />
                </div>
                <div className="md:col-span-2">
                  <DisplayItem
                    label="Complemento de localizacao"
                    value={linhasEndereco[1] || "Nao informado"}
                    multiline
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<ShieldCheck size={18} />}
              title="Seguranca da conta"
              description="Resumo do que protege a conta administradora que hoje controla este painel."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DisplayItem
                  label="Troca de senha"
                  value={
                    autenticadorAtivo
                      ? "Exige codigo do autenticador ou backup code antes de salvar."
                      : "Protegida pela sessao autenticada atual."
                  }
                  multiline
                />
                <DisplayItem
                  label="Autenticador"
                  value={
                    loadingMfa
                      ? "Verificando status..."
                      : autenticadorAtivo
                        ? `Ativo com ${mfaSnapshot.backupCodesRemaining} backup code(s) restantes.`
                        : "Ainda nao ativado nesta conta."
                  }
                  multiline
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={<Globe size={18} />}
              title="App cliente premium"
              description="Resumo do perfil publico usado na vitrine do aplicativo do cliente."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DisplayItem
                  label="Publicacao"
                  value={
                    planoPremium
                      ? perfilForm.app_cliente_publicado
                        ? "Publicado na vitrine premium."
                        : "Ainda nao publicado."
                      : "Disponivel somente no plano Premium."
                  }
                  multiline
                />
                <DisplayItem
                  label="Estacionamento"
                  value={perfilForm.estacionamento ? "Sim" : "Nao"}
                />
                <DisplayItem
                  label="Mapa no app cliente"
                  value={formatMapPoint(
                    perfilForm.latitude,
                    perfilForm.longitude
                  )}
                />
                <div className="md:col-span-2">
                  <DisplayItem
                    label="Descricao publica"
                    value={
                      perfilForm.descricao_publica ||
                      "Nenhuma descricao publica cadastrada."
                    }
                    multiline
                  />
                </div>
                <div className="md:col-span-2">
                  <DisplayItem
                    label="Formas de pagamento"
                    value={
                      metodosPagamento.length
                        ? metodosPagamento.join(" | ")
                        : "Nenhuma forma de pagamento publica cadastrada."
                    }
                    multiline
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <SectionCard
              icon={<Sparkles size={18} />}
              title="Acoes do perfil"
              description="Escolha o que deseja atualizar sem perder a visao geral do perfil."
            >
              <div className="space-y-3">
                <SidebarAction
                  icon={<PencilLine size={16} />}
                  title="Editar dados comerciais"
                  description="Nome, responsavel, e-mail, telefone e documento."
                  onClick={() => abrirModal("comercial")}
                />

                <SidebarAction
                  icon={<MapPin size={16} />}
                  title="Editar endereco"
                  description="Rua, numero, bairro, cidade, estado e CEP."
                  onClick={() => abrirModal("endereco")}
                />

                <SidebarAction
                  icon={<Globe size={16} />}
                  title="App cliente premium"
                  description="Monte a vitrine publica do salao e publique quando o Premium estiver ativo."
                  onClick={() => abrirModal("app_cliente")}
                />

                <SidebarAction
                  icon={<KeyRound size={16} />}
                  title="Trocar senha"
                  description="Quando houver autenticador ativo, este fluxo exige TOTP ou backup code."
                  onClick={() => abrirModal("senha")}
                  tone="security"
                />

                <SidebarAction
                  icon={<ShieldCheck size={16} />}
                  title="Autenticador"
                  description="Ative TOTP, gere backup codes e desative a protecao com criterio."
                  onClick={() => abrirModal("autenticador")}
                  tone="security"
                />
              </div>
            </SectionCard>

            <section className="rounded-[24px] border border-[rgba(199,162,92,0.28)] bg-[rgba(199,162,92,0.10)] p-4">
              <div className="flex items-start gap-3">
                <CircleAlert size={18} className="mt-0.5 text-zinc-900" />
                <div>
                  <div className="text-sm font-bold text-zinc-950">
                    Protecao da conta
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-zinc-600">
                    Ative o autenticador para reforcar a seguranca da conta e
                    manter uma forma segura de recuperacao com backup codes.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <AppModal
        open={activeModal === "comercial"}
        onClose={() => setActiveModal(null)}
        title="Editar dados comerciais"
        description="Atualize identidade principal, contatos e documento do negocio."
        eyebrow="Perfil do salao"
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvarDadosComerciais}
              disabled={savingPerfil}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingPerfil ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Salvar dados
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome do salao">
            <TextInput
              value={comercialDraft.nome}
              onChange={(event) =>
                setComercialDraft((prev) => ({
                  ...prev,
                  nome: event.target.value,
                }))
              }
              placeholder="Ex.: Salao Premium"
            />
          </Field>

          <Field label="Responsavel">
            <TextInput
              value={comercialDraft.responsavel}
              onChange={(event) =>
                setComercialDraft((prev) => ({
                  ...prev,
                  responsavel: event.target.value,
                }))
              }
              placeholder="Nome do responsavel"
            />
          </Field>

          <Field label="E-mail">
            <div className="relative">
              <TextInput
                value={comercialDraft.email}
                onChange={(event) =>
                  setComercialDraft((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="email@exemplo.com"
                className="pl-11"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                size={16}
              />
            </div>
          </Field>

          <Field label="Telefone">
            <div className="relative">
              <TextInput
                value={comercialDraft.telefone}
                onChange={(event) =>
                  setComercialDraft((prev) => ({
                    ...prev,
                    telefone: event.target.value,
                  }))
                }
                placeholder="(00) 00000-0000"
                className="pl-11"
              />
              <Phone
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                size={16}
              />
            </div>
          </Field>

          <Field label="CPF/CNPJ">
            <TextInput
              value={comercialDraft.cpf_cnpj}
              onChange={(event) =>
                setComercialDraft((prev) => ({
                  ...prev,
                  cpf_cnpj: event.target.value,
                }))
              }
              placeholder="Documento principal"
            />
          </Field>

          <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
            A foto do perfil do salao agora e atualizada direto na area
            Identidade do negocio, clicando na imagem.
          </div>
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "endereco"}
        onClose={() => setActiveModal(null)}
        title="Editar endereco"
        description="Atualize os dados de localizacao do salao."
        eyebrow="Perfil do salao"
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvarEndereco}
              disabled={savingPerfil}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingPerfil ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Salvar endereco
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Endereco">
              <div className="relative">
                <TextInput
                  value={enderecoDraft.endereco}
                  onChange={(event) =>
                    setEnderecoDraft((prev) => ({
                      ...prev,
                      endereco: event.target.value,
                    }))
                  }
                  placeholder="Rua / Avenida"
                  className="pl-11"
                />
                <MapPin
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={16}
                />
              </div>
            </Field>
          </div>

          <Field label="Numero">
            <TextInput
              value={enderecoDraft.numero}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  numero: event.target.value,
                }))
              }
              placeholder="Numero"
            />
          </Field>

          <Field label="Bairro">
            <TextInput
              value={enderecoDraft.bairro}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  bairro: event.target.value,
                }))
              }
              placeholder="Bairro"
            />
          </Field>

          <Field label="Cidade">
            <TextInput
              value={enderecoDraft.cidade}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  cidade: event.target.value,
                }))
              }
              placeholder="Cidade"
            />
          </Field>

          <Field label="Estado">
            <TextInput
              value={enderecoDraft.estado}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  estado: event.target.value,
                }))
              }
              placeholder="UF"
            />
          </Field>

          <Field label="CEP">
            <TextInput
              value={enderecoDraft.cep}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  cep: event.target.value,
                }))
              }
              placeholder="00000-000"
            />
          </Field>
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "senha"}
        onClose={() => setActiveModal(null)}
        title="Trocar senha da conta"
        description="A senha da conta administradora e atualizada no Supabase Auth."
        eyebrow="Seguranca"
        maxWidthClassName="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={trocarSenha}
              disabled={savingSenha}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingSenha ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}
              Atualizar senha
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            {autenticadorAtivo ? (
              <p className="leading-6">
                Esta conta ja esta protegida com autenticador. Para trocar a
                senha, confirme com o codigo do app ou use um backup code.
              </p>
            ) : (
              <p className="leading-6">
                Se quiser reforcar a protecao da conta, ative o autenticador.
                Depois disso, toda troca de senha pede confirmacao adicional.
              </p>
            )}
          </div>

          <Field label="Nova senha">
            <TextInput
              type="password"
              value={passwordForm.novaSenha}
              onChange={(event) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  novaSenha: event.target.value,
                }))
              }
              placeholder="Minimo 6 caracteres"
            />
          </Field>

          <Field label="Confirmar senha">
            <TextInput
              type="password"
              value={passwordForm.confirmarSenha}
              onChange={(event) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirmarSenha: event.target.value,
                }))
              }
              placeholder="Repita a nova senha"
            />
          </Field>

          {autenticadorAtivo ? (
            <>
              <Field label="Codigo do autenticador">
                <TextInput
                  inputMode="numeric"
                  value={passwordForm.codigoTotp}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      codigoTotp: event.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  placeholder="Digite os 6 digitos do app"
                />
              </Field>

              <Field label="Ou use um backup code">
                <TextInput
                  value={passwordForm.backupCode}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      backupCode: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="XXXX-XXXX"
                />
              </Field>
            </>
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "app_cliente"}
        onClose={() => setActiveModal(null)}
        title="Perfil publico do app cliente"
        description="Defina como o salao aparece na vitrine do cliente final e publique quando o plano Premium estiver ativo."
        eyebrow="App cliente"
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvarPerfilPublico}
              disabled={savingPerfil}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingPerfil ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Salvar perfil publico
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div
            className={`rounded-[22px] border p-4 text-sm leading-6 ${
              planoPremium
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {planoPremium ? (
              <>
                Este salao ja pode aparecer no app cliente. Basta completar os
                dados abaixo e ativar a publicacao.
              </>
            ) : (
              <>
                Voce pode preparar a descricao e os dados publicos agora, mas a
                publicacao na vitrine fica liberada somente no plano Premium.
              </>
            )}
          </div>

          <Field label="Descricao publica">
            <textarea
              value={appClienteDraft.descricao_publica || ""}
              onChange={(event) =>
                setAppClienteDraft((prev) => ({
                  ...prev,
                  descricao_publica: event.target.value,
                }))
              }
              rows={4}
              placeholder="Conte em poucas linhas o estilo do salao, especialidades e o que faz a experiencia valer a visita."
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
            />
          </Field>

          <MapLocationPicker
            latitude={appClienteDraft.latitude}
            longitude={appClienteDraft.longitude}
            addressQuery={appClienteAddressQuery}
            onChange={updateAppClienteMapLocation}
          />

          <Field label="Formas de pagamento">
            <TextInput
              value={appClienteDraft.formas_pagamento_publico || ""}
              onChange={(event) =>
                setAppClienteDraft((prev) => ({
                  ...prev,
                  formas_pagamento_publico: event.target.value,
                }))
              }
              placeholder="Pix, Credito, Debito, Dinheiro"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={Boolean(appClienteDraft.estacionamento)}
                onChange={(event) =>
                  setAppClienteDraft((prev) => ({
                    ...prev,
                    estacionamento: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Informar estacionamento disponivel
            </label>

            <label
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                planoPremium
                  ? "border-zinc-200 bg-zinc-50 text-zinc-800"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <input
                type="checkbox"
                checked={Boolean(appClienteDraft.app_cliente_publicado)}
                disabled={!planoPremium}
                onChange={(event) =>
                  setAppClienteDraft((prev) => ({
                    ...prev,
                    app_cliente_publicado: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Publicar na vitrine do app cliente
            </label>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "autenticador"}
        onClose={fecharModalAutenticador}
        title="Autenticador da conta"
        description="Adicione uma segunda etapa de confirmacao para proteger melhor o acesso."
        eyebrow="Seguranca"
        maxWidthClassName="max-w-3xl"
        closeDisabled={mfaBusy}
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-950">
              <ShieldCheck size={16} />
              Status atual
            </div>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <DisplayItem
                label="Protecao TOTP"
                value={
                  loadingMfa
                    ? "Verificando..."
                    : autenticadorAtivo
                      ? "Ativa"
                      : "Nao ativada"
                }
              />
              <DisplayItem
                label="Backup codes restantes"
                value={String(mfaSnapshot.backupCodesRemaining || 0)}
              />
              <DisplayItem
                label="Ultima geracao"
                value={formatDateTime(mfaSnapshot.backupCodesGeneratedAt)}
              />
              <DisplayItem
                label="Ultimo uso"
                value={formatDateTime(mfaSnapshot.backupCodesLastUsedAt)}
              />
            </div>
            {mfaSnapshot.backupCodesLockedUntil ? (
              <p className="mt-3 text-sm leading-6 text-amber-700">
                Backup codes bloqueados ate{" "}
                {formatDateTime(mfaSnapshot.backupCodesLockedUntil)} por excesso
                de tentativas.
              </p>
            ) : null}
          </div>

          {!autenticadorAtivo && !totpSetup ? (
            <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
              <div className="text-sm font-bold text-zinc-950">
                Ativar autenticador
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Vamos preparar um fator TOTP para Google Authenticator ou apps
                equivalentes. Depois da verificacao, a tela gera um lote novo de
                backup codes para emergencias.
              </p>
              <button
                type="button"
                onClick={prepararAutenticador}
                disabled={mfaBusy}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {mfaBusy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Preparar autenticador
              </button>
            </div>
          ) : null}

          {totpSetup ? (
            <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
              <div className="text-sm font-bold text-zinc-950">
                Confirmar ativacao
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Escaneie o QR code no seu aplicativo autenticador ou use o
                segredo manual. Depois confirme com o codigo gerado.
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3">
                  {qrCodeMarkup ? (
                    <div
                      className="flex min-h-[190px] items-center justify-center rounded-2xl bg-white p-2"
                      dangerouslySetInnerHTML={{ __html: qrCodeMarkup }}
                    />
                  ) : qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR code do autenticador"
                      className="h-full w-full rounded-2xl bg-white object-contain p-2"
                    />
                  ) : (
                    <div className="flex min-h-[190px] items-center justify-center rounded-2xl bg-white p-4 text-center text-sm text-zinc-500">
                      Nao foi possivel montar o QR code. Use o segredo manual ao lado.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Field label="Segredo manual">
                    <TextInput
                      value={totpSetup.secret}
                      readOnly
                      className="font-mono uppercase tracking-[0.08em]"
                    />
                  </Field>

                  <Field label="Codigo do app">
                    <TextInput
                      inputMode="numeric"
                      value={setupCode}
                      onChange={(event) =>
                        setSetupCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Digite os 6 digitos"
                    />
                  </Field>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={concluirAtivacaoAutenticador}
                      disabled={mfaBusy}
                      className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {mfaBusy ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Ativar e gerar backup codes
                    </button>

                    <button
                      type="button"
                      onClick={fecharModalAutenticador}
                      disabled={mfaBusy}
                      className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Cancelar preparo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {autenticadorAtivo ? (
            <>
              <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
                <div className="text-sm font-bold text-zinc-950">
                  Gerar novos backup codes
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Gere novos backup codes quando quiser renovar a reserva de
                  acesso da conta.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <TextInput
                    inputMode="numeric"
                    value={manageCode}
                    onChange={(event) =>
                      setManageCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="Codigo atual do autenticador"
                  />
                  <button
                    type="button"
                    onClick={regenerarBackupCodes}
                    disabled={mfaBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {mfaBusy ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    Gerar lote novo
                  </button>
                </div>
              </div>

              <div className="rounded-[22px] border border-[rgba(199,162,92,0.35)] bg-[rgba(199,162,92,0.10)] p-4">
                <div className="text-sm font-bold text-zinc-950">
                  Desativar 2FA com seguranca
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  Se precisar remover essa protecao, confirme com o codigo atual
                  do autenticador ou com um backup code valido.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <TextInput
                      inputMode="numeric"
                      value={manageCode}
                      onChange={(event) =>
                        setManageCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Codigo atual do autenticador"
                    />
                    <button
                      type="button"
                      onClick={desativarAutenticadorPorTotp}
                      disabled={mfaBusy}
                      className="rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Desativar com TOTP
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <TextInput
                      value={disableBackupCode}
                      onChange={(event) =>
                        setDisableBackupCode(event.target.value.toUpperCase())
                      }
                      placeholder="Backup code de recuperacao"
                    />
                    <button
                      type="button"
                      onClick={desativarAutenticadorPorBackupCode}
                      disabled={mfaBusy}
                      className="rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Desativar com backup code
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {revealedBackupCodes.length > 0 ? (
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-bold text-emerald-900">
                Backup codes gerados
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Guarde estes codigos em um local seguro. Cada codigo funciona
                uma unica vez.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {revealedBackupCodes.map((code) => (
                  <div
                    key={code}
                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 font-mono text-sm font-bold tracking-[0.08em] text-zinc-900"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-bold text-zinc-950">
              Como funciona
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              Depois de ativar o autenticador, a conta passa a pedir confirmacao
              extra em alteracoes sensiveis e voce continua com backup codes
              para emergencias.
            </p>
          </div>

          {autenticadorAtivo ? (
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-bold text-zinc-950">
                Perdeu acesso ao aplicativo autenticador?
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                Abra uma solicitacao segura para recuperacao. A equipe pode pedir
                confirmacao da titularidade e o processo pode levar ate 24 horas
                por seguranca.
              </p>
              <button
                type="button"
                onClick={abrirRecuperacaoAutenticador}
                disabled={creatingRecoveryTicket || mfaBusy}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                {creatingRecoveryTicket ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <LifeBuoy size={16} />
                )}
                Abrir recuperacao segura
              </button>
            </div>
          ) : null}
        </div>
      </AppModal>
    </>
  );
}
