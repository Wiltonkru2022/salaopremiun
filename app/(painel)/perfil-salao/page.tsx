"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  CircleAlert,
  Copy,
  Download,
  Globe,
  LifeBuoy,
  KeyRound,
  LockKeyhole,
  Loader2,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  QrCode,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import AppLoading from "@/components/ui/AppLoading";
import AppModal from "@/components/ui/AppModal";
import { Field, SectionCard, TextInput } from "@/components/configuracoes/ui";
import { EMPTY_SALAO } from "@/components/configuracoes/constants";
import type { SalaoForm } from "@/components/configuracoes/types";
import { PAINEL_SESSION_STORAGE_KEY } from "@/lib/painel/session-snapshot";
import { getPlanoCatalogo } from "@/lib/plans/catalog";
import {
  buildDefaultSalaoSlug,
  buildFallbackSalaoSlug,
  buildSalaoPublicUrl,
  normalizeSalaoSlug,
} from "@/lib/saloes/public-link";
import { createClient } from "@/lib/supabase/client";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";

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
  | "excluir_salao"
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

type PortfolioFoto = {
  id: string;
  imagemUrl: string;
  legenda: string;
  ordem: number;
};

type GoogleCalendarConnectionState = {
  loading: boolean;
  connected: boolean;
  configured: boolean;
  allowed: boolean;
  blockReason: string | null;
  googleEmail: string | null;
};

type GoogleLoginConnectionState = {
  loading: boolean;
  connected: boolean;
  googleEmail: string | null;
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
  app_cliente_pausado?: boolean | null;
  app_cliente_pausa_mensagem?: string | null;
  app_cliente_slug?: string | null;
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
  if (!value) return "Não registrado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não registrado";

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

async function buscarCoordenadasEndereco(form: SalaoForm) {
  const response = await fetch("/api/painel/salao-geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endereco: form.endereco || "",
      numero: form.numero || "",
      bairro: form.bairro || "",
      cidade: form.cidade || "",
      estado: form.estado || "",
      cep: form.cep || "",
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    coordinates?: {
      latitude?: number;
      longitude?: number;
      precision?: "endereco" | "cidade";
    } | null;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message || "Não foi possível localizar o endereço.");
  }

  return payload.coordinates || null;
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
  tone?: "default" | "security" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 ${
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-950 hover:bg-red-100"
          : tone === "security"
          ? "border-[rgba(199,162,92,0.35)] bg-[rgba(199,162,92,0.10)]"
          : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-2xl border p-2.5 ${
            tone === "danger"
              ? "border-red-200 bg-white text-red-700"
              : tone === "security"
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
  const searchParams = useSearchParams();
  const { snapshot: painelSession } = usePainelSession();

  const [loading, setLoading] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);
  const [uploadingPublicAsset, setUploadingPublicAsset] = useState<
    "logo" | "capa" | "portfolio" | null
  >(null);
  const [loadingMfa, setLoadingMfa] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [googleCalendar, setGoogleCalendar] =
    useState<GoogleCalendarConnectionState>({
      loading: true,
      connected: false,
      configured: false,
      allowed: false,
      blockReason: null,
      googleEmail: null,
    });
  const [googleLogin, setGoogleLogin] = useState<GoogleLoginConnectionState>({
    loading: true,
    connected: false,
    googleEmail: null,
  });
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [linkingGoogleLogin, setLinkingGoogleLogin] = useState(false);
  const [unlinkingGoogleLogin, setUnlinkingGoogleLogin] = useState(false);
  const [creatingRecoveryTicket, setCreatingRecoveryTicket] = useState(false);
  const [deletingSalao, setDeletingSalao] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [deleteConfirmacao, setDeleteConfirmacao] = useState("");
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [perfilForm, setPerfilForm] = useState<SalaoForm>(EMPTY_SALAO);
  const [comercialDraft, setComercialDraft] = useState<SalaoForm>(EMPTY_SALAO);
  const [enderecoDraft, setEnderecoDraft] = useState<SalaoForm>(EMPTY_SALAO);
  const [appClienteDraft, setAppClienteDraft] =
    useState<SalaoForm>(EMPTY_SALAO);
  const [portfolioFotos, setPortfolioFotos] = useState<PortfolioFoto[]>([]);
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
  const publicSlug = useMemo(
    () =>
      normalizeSalaoSlug(perfilForm.app_cliente_slug || "") ||
      buildDefaultSalaoSlug(perfilForm.nome),
    [perfilForm.app_cliente_slug, perfilForm.nome]
  );
  const publicUrl = useMemo(() => buildSalaoPublicUrl(publicSlug), [publicSlug]);
  const googleCalendarStatus = searchParams.get("google_calendar");
  const googleLoginStatus = searchParams.get("google_login");
  const qrCodeUrl = useMemo(
    () =>
      `/api/painel/qrcode?text=${encodeURIComponent(
        publicUrl
      )}`,
    [publicUrl]
  );
  const planoPremium = useMemo(
    () => {
      if (painelSession?.planoRecursos) {
        return painelSession.planoRecursos.app_cliente !== false;
      }

      const codigo = getPlanoCatalogo(perfilForm.plano).codigo;
      return codigo === "teste_gratis" || codigo === "pro" || codigo === "premium";
    },
    [painelSession?.planoRecursos, perfilForm.plano]
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
      console.warn("Não foi possível carregar status do autenticador:", error);
      setTotpFactor(null);
      setMfaSnapshot(EMPTY_MFA_SNAPSHOT);
    } finally {
      setLoadingMfa(false);
    }
  }, [callMfaApi, supabase]);

  const carregarPortfolio = useCallback(async () => {
    try {
      const response = await fetch("/api/painel/salao-portfolio", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        fotos?: PortfolioFoto[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Não foi possível carregar o portfólio.");
      }

      setPortfolioFotos(Array.isArray(payload.fotos) ? payload.fotos : []);
    } catch (error) {
      console.warn("Não foi possível carregar portfólio do salão:", error);
      setPortfolioFotos([]);
    }
  }, []);

  const carregarGoogleCalendar = useCallback(async () => {
    try {
      setGoogleCalendar((current) => ({ ...current, loading: true }));
      const response = await fetch("/api/integracoes/google-calendar/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            configured?: boolean;
            allowed?: boolean;
            blockReason?: string | null;
            connected?: boolean;
            googleEmail?: string | null;
          }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error("Não foi possível verificar o Google Calendar.");
      }

      setGoogleCalendar({
        loading: false,
        configured: Boolean(data.configured),
        allowed: Boolean(data.allowed),
        blockReason: data.blockReason || null,
        connected: Boolean(data.connected),
        googleEmail: data.googleEmail || null,
      });
    } catch {
      setGoogleCalendar({
        loading: false,
        configured: false,
        allowed: false,
        blockReason: null,
        connected: false,
        googleEmail: null,
      });
    }
  }, []);

  const carregarGoogleLogin = useCallback(async () => {
    try {
      setGoogleLogin((current) => ({ ...current, loading: true }));
      const response = await fetch("/api/integracoes/google-login/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            connected?: boolean;
            googleEmail?: string | null;
          }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error("Não foi possível verificar o login com Google.");
      }

      setGoogleLogin({
        loading: false,
        connected: Boolean(data.connected),
        googleEmail: data.googleEmail || null,
      });
    } catch {
      setGoogleLogin({
        loading: false,
        connected: false,
        googleEmail: null,
      });
    }
  }, []);

  const carregarPerfil = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setMsg("");
      setSemPermissao(false);

      if (!painelSession?.idSalao || !painelSession?.permissoes) {
        setErro("Não foi possível identificar o salão da conta atual.");
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
          "id, nome, responsavel, email, telefone, cpf_cnpj, endereco, numero, bairro, cidade, estado, cep, logo_url, plano, status, descricao_publica, foto_capa_url, latitude, longitude, estacionamento, formas_pagamento_publico, app_cliente_publicado, app_cliente_pausado, app_cliente_pausa_mensagem, app_cliente_slug"
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
          app_cliente_pausado: Boolean(row.app_cliente_pausado),
          app_cliente_pausa_mensagem:
            row.app_cliente_pausa_mensagem ||
            "Salão pausado no momento. Em breve a agenda online volta ao normal.",
          app_cliente_slug:
            row.app_cliente_slug ||
            buildFallbackSalaoSlug(row.nome || "", row.id || ""),
        };

        setPerfilForm(nextForm);
        setComercialDraft(nextForm);
        setEnderecoDraft(nextForm);
        setAppClienteDraft(nextForm);
      }

      await Promise.all([
        carregarMfa(),
        carregarPortfolio(),
        carregarGoogleCalendar(),
        carregarGoogleLogin(),
      ]);
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar perfil."
      );
    } finally {
      setLoading(false);
    }
  }, [
    carregarGoogleCalendar,
    carregarGoogleLogin,
    carregarMfa,
    carregarPortfolio,
    supabase,
    painelSession,
  ]);

  useEffect(() => {
    void carregarPerfil();
  }, [carregarPerfil]);

  useEffect(() => {
    if (loading) return;

    if (googleLoginStatus === "connected") {
      setErro("");
      setMsg("Login com Google integrado com sucesso.");
      return;
    }

    if (googleCalendarStatus === "connected") {
      setErro("");
      setMsg("Google Calendar conectado com sucesso.");
      return;
    }

    if (googleCalendarStatus === "env") {
      setMsg("");
      setErro("Configure as variáveis do Google Calendar na Vercel antes de conectar.");
      return;
    }

    if (googleCalendarStatus === "erro") {
      setMsg("");
      setErro("Não foi possível concluir a conexão com Google Calendar. Confira o redirect do Google Cloud e tente novamente.");
    }
  }, [googleCalendarStatus, googleLoginStatus, loading]);

  async function fecharModalAutenticador() {
    if (totpSetup?.factorId && !autenticadorAtivo) {
      try {
        await supabase.auth.mfa.unenroll({
          factorId: totpSetup.factorId,
        });
      } catch (error) {
        console.warn("Não foi possível limpar enrolamento pendente:", error);
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

    if (modal === "excluir_salao") {
      setDeleteConfirmacao("");
      setDeleteMotivo("");
    }

    setActiveModal(modal);
  }

  async function excluirSalaoDefinitivamente() {
    if (deleteConfirmacao.trim() !== "EXCLUIR") {
      setErro("Digite EXCLUIR para confirmar a exclusão definitiva.");
      return;
    }

    try {
      setDeletingSalao(true);
      setErro("");
      setMsg("");

      const response = await fetch("/api/painel/excluir-salao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmacao: "EXCLUIR",
          motivo: deleteMotivo.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error || "Não foi possível excluir o salão agora."
        );
      }

      try {
        window.localStorage.removeItem(PAINEL_SESSION_STORAGE_KEY);
        window.sessionStorage.clear();
      } catch {
        // Navegadores privados podem bloquear storage; o logout ainda continua.
      }

      await supabase.auth.signOut({ scope: "local" });
      router.replace("/salao-excluido");
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao excluir o salão."
      );
    } finally {
      setDeletingSalao(false);
    }
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
        app_cliente_pausado: Boolean(
          patch.app_cliente_pausado ?? perfilForm.app_cliente_pausado
        ),
        app_cliente_pausa_mensagem:
          (patch.app_cliente_pausa_mensagem ??
            perfilForm.app_cliente_pausa_mensagem) ||
          "Salão pausado no momento. Em breve a agenda online volta ao normal.",
        app_cliente_slug:
          normalizeSalaoSlug(
            patch.app_cliente_slug ?? perfilForm.app_cliente_slug ?? ""
          ) || buildDefaultSalaoSlug(patch.nome ?? perfilForm.nome),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("saloes")
        .update(payload)
        .eq("id", idSalao);

      if (error) throw error;

      try {
        await asLooseSupabaseClient(supabase).rpc("refresh_client_app_marketplace_cache", {
          p_id_salao: idSalao,
        });
      } catch {
        // A função pode não existir em ambientes antigos; a vitrine também tem fallback ao vivo.
      }

      const nextForm = { ...perfilForm, ...patch, app_cliente_slug: payload.app_cliente_slug };
      setPerfilForm(nextForm);
      setComercialDraft(nextForm);
      setEnderecoDraft(nextForm);
      setAppClienteDraft(nextForm);
      setMsg(sucesso);
      setActiveModal(null);
      router.refresh();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("saloes_app_cliente_slug_uidx")) {
        setErro("Esse link de divulgação já está em uso. Escolha outro final para o link.");
        return false;
      }
      setErro(
        message || "Erro ao salvar perfil."
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
      setErro("A imagem precisa ter até 5MB.");
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
        throw new Error(result?.message || "Não foi possível enviar a imagem.");
      }

      if (!result?.publicUrl) {
        throw new Error("Não foi possível obter a URL pública da imagem.");
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
          : "Não foi possível enviar a imagem."
      );
    } finally {
      setUploadingPublicAsset(null);
    }
  }

  async function enviarFotoPortfolio(file: File | undefined) {
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
      setMsg("");
      setUploadingPublicAsset("portfolio");

      const body = new FormData();
      body.set("file", file);

      const response = await fetch("/api/painel/salao-portfolio", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        foto?: PortfolioFoto;
        message?: string;
      };

      if (!response.ok || !payload.foto) {
        throw new Error(payload.message || "Não foi possível enviar a foto.");
      }

      setPortfolioFotos((prev) => [...prev, payload.foto as PortfolioFoto]);
      setMsg("Foto adicionada ao portfólio do app cliente.");
      router.refresh();
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a foto do portfólio."
      );
    } finally {
      setUploadingPublicAsset(null);
    }
  }

  async function removerFotoPortfolio(id: string) {
    if (!id) return;

    try {
      setErro("");
      setMsg("");

      const response = await fetch(
        `/api/painel/salao-portfolio?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Não foi possível remover a foto.");
      }

      setPortfolioFotos((prev) => prev.filter((foto) => foto.id !== id));
      setMsg("Foto removida do portfólio.");
      router.refresh();
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a foto do portfólio."
      );
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
    const coordenadas = await buscarCoordenadasEndereco(enderecoDraft).catch(
      () => null
    );

    await atualizarPerfil(
      {
        endereco: enderecoDraft.endereco,
        numero: enderecoDraft.numero,
        bairro: enderecoDraft.bairro,
        cidade: enderecoDraft.cidade,
        estado: enderecoDraft.estado,
        cep: enderecoDraft.cep,
        latitude:
          coordenadas?.latitude === undefined ? "" : String(coordenadas.latitude),
        longitude:
          coordenadas?.longitude === undefined
            ? ""
            : String(coordenadas.longitude),
      },
      "Endereço do salão atualizado com sucesso."
    );
  }

  async function salvarPerfilPublico() {
    await atualizarPerfil(
      {
        descricao_publica: appClienteDraft.descricao_publica || "",
        foto_capa_url: appClienteDraft.foto_capa_url || "",
        logo_url: appClienteDraft.logo_url || "",
        endereco: appClienteDraft.endereco || "",
        numero: appClienteDraft.numero || "",
        bairro: appClienteDraft.bairro || "",
        cidade: appClienteDraft.cidade || "",
        estado: appClienteDraft.estado || "",
        cep: appClienteDraft.cep || "",
        latitude: appClienteDraft.latitude || "",
        longitude: appClienteDraft.longitude || "",
        estacionamento: Boolean(appClienteDraft.estacionamento),
        formas_pagamento_publico:
          appClienteDraft.formas_pagamento_publico || "",
        app_cliente_publicado: planoPremium
          ? Boolean(appClienteDraft.app_cliente_publicado)
          : false,
        app_cliente_pausado: Boolean(appClienteDraft.app_cliente_pausado),
        app_cliente_pausa_mensagem:
          appClienteDraft.app_cliente_pausa_mensagem || "",
        app_cliente_slug:
          normalizeSalaoSlug(appClienteDraft.app_cliente_slug || "") ||
          buildDefaultSalaoSlug(appClienteDraft.nome || perfilForm.nome),
      },
      planoPremium
        ? "Perfil público do app cliente atualizado com sucesso."
        : "Perfil público salvo. A publicação fica disponível quando o salão estiver no Pro ou Premium."
    );
  }

  async function desconectarGoogleCalendar() {
    try {
      setDisconnectingGoogle(true);
      setErro("");
      setMsg("");

      const response = await fetch("/api/integracoes/google-calendar/status", {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Não foi possível desconectar o Google Calendar.");
      }

      setGoogleCalendar((current) => ({
        ...current,
        connected: false,
        googleEmail: null,
      }));
      setMsg("Google Calendar desconectado. O login com Google continua separado.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao desconectar o Google Calendar."
      );
    } finally {
      setDisconnectingGoogle(false);
    }
  }

  async function integrarLoginGoogle() {
    try {
      setLinkingGoogleLogin(true);
      setErro("");
      setMsg("");

      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set(
        "next",
        "/perfil-salao?google_login=connected"
      );

      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      setMsg("Login com Google já está vinculado nesta conta.");
      await carregarGoogleLogin();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível integrar o login com Google."
      );
    } finally {
      setLinkingGoogleLogin(false);
    }
  }

  async function removerLoginGoogle() {
    try {
      setUnlinkingGoogleLogin(true);
      setErro("");
      setMsg("");

      const response = await fetch("/api/integracoes/google-login/status", {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; message?: string }
        | null;

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Não foi possível remover o login com Google desta conta."
        );
      }

      setGoogleLogin({
        loading: false,
        connected: false,
        googleEmail: null,
      });
      setMsg(
        result.message ||
          "Login com Google removido. Esta conta continua entrando por e-mail e senha."
      );
      await carregarGoogleLogin();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao remover o login com Google."
      );
    } finally {
      setUnlinkingGoogleLogin(false);
    }
  }

  async function copiarLinkPublico() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMsg("Link de divulgação copiado.");
    } catch {
      setErro("Não foi possível copiar o link automaticamente.");
    }
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
      throw new Error("Não foi possível iniciar a verificacao do autenticador.");
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

    setErro("Informe o código do autenticador ou um backup code.");
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
        setErro("A confirmação da senha não confere.");
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
        throw new Error("Não foi possível preparar o autenticador.");
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
        setErro("Informe o código de 6 digitos do autenticador.");
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
        setErro("Informe o código atual do autenticador para gerar novos backup codes.");
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
        setErro("Informe o código atual do autenticador para desativar.");
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

      await supabase.auth.signOut({ scope: "local" });
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
        setErro("Informe um backup code válido para desativar.");
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

      await supabase.auth.signOut({ scope: "local" });
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
          payload.error || "Não foi possível abrir a recuperação do autenticador."
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
          : "Erro ao abrir recuperação do autenticador."
      );
    } finally {
      setCreatingRecoveryTicket(false);
    }
  }

  if (loading) {
    return (
      <AppLoading
        title="Carregando perfil do salão"
        message="Aguarde enquanto reunimos identidade do negocio, contatos e segurança da conta."
        fullHeight={false}
      />
    );
  }

  if (semPermissao) {
    return (
      <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-amber-800">
        Apenas administradores podem editar o perfil do salão.
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
                alt="Foto de capa do salão"
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
                  Perfil do salão
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500 sm:text-[15px]">
                  Confira os dados do negocio em um lugar só. Clique na capa ou
                  na foto do perfil para atualizar a vitrine visual do app cliente.
                </p>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-3.5">
                <div className="font-display text-lg font-bold">
                  {perfilForm.nome || "SalaoPremium"}
                </div>
                <div className="text-sm text-zinc-500">
                  {String(perfilForm.plano || "sem plano").toUpperCase()} |{" "}
                  {perfilForm.status || "status não definido"}
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

        <AppModal
          open={Boolean(erro || msg)}
          onClose={() => {
            setErro("");
            setMsg("");
          }}
          title={erro ? "Atenção" : "Tudo certo"}
          description={
            erro
              ? "Revise a mensagem antes de continuar."
              : "A ação foi concluída com segurança."
          }
          maxWidthClassName="max-w-md"
          footer={
            <button
              type="button"
              onClick={() => {
                setErro("");
                setMsg("");
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              Entendi
            </button>
          }
        >
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${
              erro
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {erro || msg}
          </div>
        </AppModal>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_340px]">
          <div className="space-y-4">
            <SectionCard
              icon={<Building2 size={18} />}
              title="Dados comerciais"
              description="Leitura principal da identidade do negocio e dos contatos usados no painel."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DisplayItem
                  label="Nome do salão"
                  value={perfilForm.nome || "Não informado"}
                />
                <DisplayItem
                  label="Responsavel"
                  value={perfilForm.responsavel || "Não informado"}
                />
                <DisplayItem
                  label="E-mail"
                  value={perfilForm.email || "Não informado"}
                />
                <DisplayItem
                  label="Telefone"
                  value={perfilForm.telefone || "Não informado"}
                />
                <DisplayItem
                  label="CPF/CNPJ"
                  value={perfilForm.cpf_cnpj || "Não informado"}
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={<MapPin size={18} />}
              title="Endereco"
              description="Base de localizacao usada em fichas, impressos e referências do salão."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <DisplayItem
                    label="Endereço principal"
                    value={linhasEndereco[0] || "Não informado"}
                  />
                </div>
                <div className="md:col-span-2">
                  <DisplayItem
                    label="Complemento de localizacao"
                    value={linhasEndereco[1] || "Não informado"}
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
                      ? "Exige código do autenticador ou backup code antes de salvar."
                      : "Protegida pela sessão autenticada atual."
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
                        : "Ainda não ativado nesta conta."
                  }
                  multiline
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={<CalendarClock size={18} />}
              title="Google Calendar"
              description="Conecte a agenda externa do salão para sincronizar atendimentos confirmados automaticamente."
            >
              <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm font-bold text-zinc-950">
                  Integração da agenda
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Ao conectar, os atendimentos confirmados da agenda podem ser
                  enviados automaticamente para o Google Calendar, sem baixar
                  arquivo manual.
                </p>
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700">
                  {googleCalendar.loading
                    ? "Verificando conexão..."
                    : googleCalendar.connected
                      ? `Conectado em ${googleCalendar.googleEmail || "conta Google"}`
                      : !googleCalendar.allowed
                        ? googleCalendar.blockReason ||
                          "Google Calendar está disponível no Pro, Premium ou teste grátis."
                      : googleCalendar.configured
                        ? "Ainda não conectado."
                        : "A integração ainda não está configurada na Vercel."}
                </div>
                {googleCalendarStatus === "connected" ? (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    Google Calendar conectado com sucesso.
                  </div>
                ) : googleCalendarStatus === "env" ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    Configure as variáveis do Google Calendar na Vercel antes
                    de conectar.
                  </div>
                ) : googleCalendarStatus === "erro" ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                    Não foi possível concluir a conexão. Confira o redirect do
                    Google Cloud e tente novamente.
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {googleCalendar.connected ? (
                    <button
                      type="button"
                      onClick={desconectarGoogleCalendar}
                      disabled={disconnectingGoogle}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {disconnectingGoogle ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Desconectar Google Agenda
                    </button>
                  ) : googleCalendar.configured && googleCalendar.allowed ? (
                    <a
                      href="/api/integracoes/google-calendar/connect"
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition ${
                        googleCalendar.loading
                          ? "pointer-events-none bg-zinc-200 text-zinc-500"
                          : "bg-zinc-950 text-white hover:bg-zinc-800"
                      }`}
                    >
                      <CalendarClock size={16} />
                      Conectar Google Calendar
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-200 px-4 text-sm font-bold text-zinc-500"
                    >
                      <CalendarClock size={16} />
                      {googleCalendar.allowed
                        ? "Google Calendar indisponível"
                        : "Dispon?vel no Pro e Premium"}
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<LockKeyhole size={18} />}
              title="Login com Google"
              description="Controle separado do acesso ao painel usando a conta Google vinculada ao usuário."
            >
              <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm font-bold text-zinc-950">
                  Segurança do acesso
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Este bloco libera ou remove o login com Google no painel. Ele não
                  mexe na sincronização do Google Calendar.
                </p>
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700">
                  {googleLogin.loading
                    ? "Verificando login com Google..."
                    : googleLogin.connected
                      ? `Login integrado em ${googleLogin.googleEmail || "conta Google"}.`
                      : "Login com Google ainda não integrado nesta conta."}
                </div>
                {googleLoginStatus === "connected" ? (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    Login com Google integrado com sucesso.
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {!googleLogin.connected ? (
                    <button
                      type="button"
                      onClick={integrarLoginGoogle}
                      disabled={linkingGoogleLogin || googleLogin.loading}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {linkingGoogleLogin ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <LockKeyhole size={16} />
                      )}
                      Integrar login com Google
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={removerLoginGoogle}
                      disabled={unlinkingGoogleLogin}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {unlinkingGoogleLogin ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Remover login com Google
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Globe size={18} />}
              title={
                planoPremium && !perfilForm.app_cliente_publicado
                  ? "Criar vitrine para o app cliente"
                  : "App cliente"
              }
              description="Resumo do perfil público usado na vitrine do aplicativo do cliente."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DisplayItem
                  label="Publicação"
                  value={
                    planoPremium
                      ? perfilForm.app_cliente_publicado
                        ? perfilForm.app_cliente_pausado
                          ? "Publicado, mas pausado: sai da vitrine e bloqueia novos agendamentos."
                          : "Publicado na vitrine do app cliente."
                        : "Vitrine pronta para configurar e publicar."
                      : "Disponível somente no plano Pro ou Premium."
                  }
                  multiline
                />
                <DisplayItem
                  label="Link de divulgação"
                  value={publicUrl}
                  multiline
                />
                <DisplayItem
                  label="Estacionamento"
                  value={perfilForm.estacionamento ? "Sim" : "Não"}
                />
                <DisplayItem
                  label="Endereço no app cliente"
                  value={linhasEndereco[0] || "Usando endereço do cadastro"}
                  multiline
                />
                <div className="md:col-span-2">
                  <DisplayItem
                    label="Descrição pública"
                    value={
                      perfilForm.descricao_publica ||
                      "Nenhuma descrição pública cadastrada."
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
                        : "Nenhuma forma de pagamento pública cadastrada."
                    }
                    multiline
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Sparkles size={18} />}
              title="Configurar vitrine"
              description="Complete o que o cliente vê antes de reservar pelo app."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 text-zinc-800">
                        <Camera size={17} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-950">
                          Fotos da vitrine e portfólio
                        </div>
                        <p className="mt-1 max-w-xl text-sm leading-5 text-zinc-600">
                          Use a foto de capa e a logo acima. Adicione até 12
                          fotos reais de trabalhos para aparecer na aba
                          Portfólio do app cliente.
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800">
                      {uploadingPublicAsset === "portfolio" ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Camera size={16} />
                      )}
                      Adicionar foto
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingPublicAsset === "portfolio"}
                        onChange={(event) => {
                          void enviarFotoPortfolio(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {portfolioFotos.length ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {portfolioFotos.map((foto) => (
                        <figure
                          key={foto.id}
                          className="group overflow-hidden rounded-[20px] border border-zinc-200 bg-white"
                        >
                          <img
                            src={foto.imagemUrl}
                            alt={foto.legenda || "Foto do portfólio"}
                            className="h-36 w-full object-cover"
                          />
                          <figcaption className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="truncate text-xs font-semibold text-zinc-600">
                              {foto.legenda || "Foto do portfólio"}
                            </span>
                            <button
                              type="button"
                              onClick={() => void removerFotoPortfolio(foto.id)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-50"
                              aria-label="Remover foto do portfólio"
                            >
                              <Trash2 size={15} />
                            </button>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
                      Nenhuma foto no portfólio ainda. Adicione imagens reais do
                      salão, antes e depois, cortes, unhas, cabelo ou trabalhos
                      que ajudem o cliente a decidir.
                    </div>
                  )}
                </div>

                <a
                  href="/configuracoes/agenda-horarios"
                  className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4 transition hover:-translate-y-0.5 hover:bg-zinc-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 text-zinc-800">
                      <CalendarClock size={17} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-950">
                        Horário de funcionamento
                      </div>
                      <p className="mt-1 text-sm leading-5 text-zinc-600">
                        Ajuste dias, abertura, fechamento e intervalo usados no
                        app cliente.
                      </p>
                    </div>
                  </div>
                </a>

                <a
                  href="/servicos"
                  className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4 transition hover:-translate-y-0.5 hover:bg-zinc-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 text-zinc-800">
                      <Scissors size={17} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-950">
                        Serviços visíveis no app
                      </div>
                      <p className="mt-1 text-sm leading-5 text-zinc-600">
                        Abra cada serviço e ative a opção de aparecer no app
                        cliente.
                      </p>
                    </div>
                  </div>
                </a>

                <a
                  href="/profissionais"
                  className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4 transition hover:-translate-y-0.5 hover:bg-zinc-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 text-zinc-800">
                      <Users size={17} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-950">
                        Profissionais visíveis no app
                      </div>
                      <p className="mt-1 text-sm leading-5 text-zinc-600">
                        Selecione quem atende pelo app cliente e mantenha a
                        agenda pronta para reservas.
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </SectionCard>

            <SectionCard
              icon={<QrCode size={18} />}
              title="Divulgacao do salão"
              description="Link e QR Code para levar o cliente direto para a página do salão no app."
            >
              <div className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
                <div className="rounded-[24px] border border-zinc-200 bg-white p-3">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code do salão ${perfilForm.nome || "SalaoPremium"}`}
                    className="aspect-square w-full rounded-[18px] bg-white object-contain"
                  />
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800">
                    <div className="break-all">{publicUrl}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={copiarLinkPublico}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
                    >
                      <Copy size={16} />
                      Copiar link
                    </button>
                      <a
                        href={qrCodeUrl}
                        download={`qrcode-${publicSlug}.svg`}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
                      >
                      <Download size={16} />
                      Baixar QR Code
                    </a>
                  </div>
                  <p className="text-sm leading-6 text-zinc-500">
                    Se o cliente abrir esse link sem estar logado, ele entra ou
                    cria conta e volta direto para esta página do salão.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <SectionCard
              icon={<Sparkles size={18} />}
              title="Ações do perfil"
              description="Escolha o que deseja atualizar sem perder a visão geral do perfil."
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
                  title="Editar endereço"
                  description="Rua, número, bairro, cidade, estado e CEP."
                  onClick={() => abrirModal("endereco")}
                />

                <SidebarAction
                  icon={<Globe size={16} />}
                  title={
                    planoPremium && !perfilForm.app_cliente_publicado
                      ? "Criar vitrine"
                      : "App cliente"
                  }
                  description={
                    planoPremium
                      ? "Configure link, QR Code, aviso de pausa e publicação no app cliente."
                      : "Monte a vitrine pública e publique quando o Pro ou Premium estiver ativo."
                  }
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
                  description="Ative TOTP, gere backup codes e desative a proteção com criterio."
                  onClick={() => abrirModal("autenticador")}
                  tone="security"
                />

                <SidebarAction
                  icon={<Trash2 size={16} />}
                  title="Excluir salão"
                  description="Apaga agenda, clientes, profissionais, comandas, serviços, produtos e configurações deste salão."
                  onClick={() => abrirModal("excluir_salao")}
                  tone="danger"
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
                    Ative o autenticador para reforcar a segurança da conta e
                    manter uma forma segura de recuperação com backup codes.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <AppModal
        open={activeModal === "excluir_salao"}
        onClose={() => {
          if (!deletingSalao) setActiveModal(null);
        }}
        title="Deseja realmente excluir este salão?"
        description="Essa ação apaga agenda, clientes, profissionais, comandas, serviços, produtos e configurações do salão. Não será possível acessar esta conta novamente."
        eyebrow="Exclusão definitiva"
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              disabled={deletingSalao}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={excluirSalaoDefinitivamente}
              disabled={deletingSalao || deleteConfirmacao.trim() !== "EXCLUIR"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-red-700 disabled:opacity-60"
            >
              {deletingSalao ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Trash2 size={16} />
              )}
              Excluir salão definitivamente
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950">
            Esta confirmação é permanente. Antes de continuar, confira se não
            há agendamentos, vendas ou dados que ainda precisam ser consultados.
          </div>

          <Field label="Digite EXCLUIR para confirmar">
            <TextInput
              value={deleteConfirmacao}
              onChange={(event) =>
                setDeleteConfirmacao(event.target.value.toUpperCase())
              }
              placeholder="EXCLUIR"
              autoCapitalize="characters"
              autoComplete="off"
              disabled={deletingSalao}
            />
          </Field>

          <Field label="Motivo da saída (opcional)">
            <textarea
              value={deleteMotivo}
              onChange={(event) => setDeleteMotivo(event.target.value)}
              placeholder="Conte em poucas palavras o motivo. Isso ajuda o Admin Master a entender e recuperar o contato depois."
              disabled={deletingSalao}
              className="min-h-28 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 disabled:opacity-60"
            />
          </Field>
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "comercial"}
        onClose={() => setActiveModal(null)}
        title="Editar dados comerciais"
        description="Atualize identidade principal, contatos e documento do negocio."
        eyebrow="Perfil do salão"
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
          <Field label="Nome do salão">
            <TextInput
              value={comercialDraft.nome}
              onChange={(event) =>
                setComercialDraft((prev) => ({
                  ...prev,
                  nome: event.target.value,
                }))
              }
              placeholder="Ex.: Salão Premium"
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
            A foto do perfil do salão agora é atualizada direto na área
            Identidade do negocio, clicando na imagem.
          </div>
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "endereco"}
        onClose={() => setActiveModal(null)}
        title="Editar endereço"
        description="Atualize os dados de localizacao do salão."
        eyebrow="Perfil do salão"
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
              Salvar endereço
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
                Esta conta já está protegida com autenticador. Para trocar a
                senha, confirme com o código do app ou use um backup code.
              </p>
            ) : (
              <p className="leading-6">
                Se quiser reforcar a proteção da conta, ative o autenticador.
                Depois disso, toda troca de senha pede confirmação adicional.
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
              placeholder="Mínimo 6 caracteres"
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
        title={
          planoPremium && !perfilForm.app_cliente_publicado
            ? "Criar vitrine para o app cliente"
            : "Perfil público do app cliente"
        }
        description="Defina como o salão aparece na vitrine do cliente final e publique quando o plano Pro ou Premium estiver ativo."
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
              Salvar perfil público
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
                O link e o QR Code já ficam prontos pelo nome do salão. Complete
                a vitrine e ative a publicação quando quiser aparecer no app cliente.
              </>
            ) : (
              <>
                Você pode preparar a descrição e os dados públicos agora, mas a
                  publicação na vitrine fica liberada somente no plano Pro ou Premium.
              </>
            )}
          </div>

          <Field label="Descrição pública">
            <textarea
              value={appClienteDraft.descricao_publica || ""}
              onChange={(event) =>
                setAppClienteDraft((prev) => ({
                  ...prev,
                  descricao_publica: event.target.value,
                }))
              }
              rows={4}
              placeholder="Conte em poucas linhas o estilo do salão, especialidades e o que faz a experiência valer a visita."
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Field label="Link de divulgação">
              <div className="flex rounded-2xl border border-zinc-300 bg-white focus-within:border-zinc-900">
                <span className="hidden shrink-0 items-center border-r border-zinc-200 px-4 text-sm font-semibold text-zinc-500 md:flex">
                  app.salaopremiun.com.br/app-cliente/salao/
                </span>
                <input
                  value={appClienteDraft.app_cliente_slug || ""}
                  onChange={(event) =>
                    setAppClienteDraft((prev) => ({
                      ...prev,
                      app_cliente_slug: normalizeSalaoSlug(event.target.value),
                    }))
                  }
                  placeholder="nome-do-salao"
                  className="min-w-0 flex-1 rounded-2xl bg-transparent px-4 py-3 text-sm outline-none"
                />
              </div>
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  setAppClienteDraft((prev) => ({
                    ...prev,
                    app_cliente_slug: buildDefaultSalaoSlug(
                      prev.nome || perfilForm.nome
                    ),
                  }))
                }
                className="h-12 rounded-2xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Gerar link
              </button>
            </div>
          </div>

          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-bold text-zinc-950">
              Endereço exibido no app cliente
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              O app cliente usa o endereço cadastrado na área Endereço deste
              perfil. Para alterar rua, número, bairro, cidade, estado ou CEP,
              feche este modal e use a ação Editar endereço.
            </p>
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800">
              {formatAddress(appClienteDraft).join(" | ") ||
                "Endereço ainda não informado."}
            </div>
          </div>

          <Field label="Formas de pagamento">
            <TextInput
              value={appClienteDraft.formas_pagamento_publico || ""}
              onChange={(event) =>
                setAppClienteDraft((prev) => ({
                  ...prev,
                  formas_pagamento_publico: event.target.value,
                }))
              }
              placeholder="Pix, Crédito, Débito, Dinheiro"
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
              Informar estacionamento disponível
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

          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
            <label className="flex items-center gap-3 text-sm font-bold text-zinc-900">
              <input
                type="checkbox"
                checked={Boolean(appClienteDraft.app_cliente_pausado)}
                disabled={!appClienteDraft.app_cliente_publicado}
                onChange={(event) =>
                  setAppClienteDraft((prev) => ({
                    ...prev,
                    app_cliente_pausado: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Pausar no app cliente
            </label>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Pausado sai da vitrine de salões, mas o link direto continua
              abrindo a página com aviso e sem permitir agendar.
            </p>
            <div className="mt-3">
              <Field label="Mensagem exibida quando estiver pausado">
                <TextInput
                  value={appClienteDraft.app_cliente_pausa_mensagem || ""}
                  onChange={(event) =>
                    setAppClienteDraft((prev) => ({
                      ...prev,
                      app_cliente_pausa_mensagem: event.target.value,
                    }))
                  }
                  placeholder="Estamos de férias e voltamos em breve."
                />
              </Field>
            </div>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "autenticador"}
        onClose={fecharModalAutenticador}
        title="Autenticador da conta"
        description="Adicione uma segunda etapa de confirmação para proteger melhor o acesso."
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
                      : "Não ativada"
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
                label="Último uso"
                value={formatDateTime(mfaSnapshot.backupCodesLastUsedAt)}
              />
            </div>
            {mfaSnapshot.backupCodesLockedUntil ? (
              <p className="mt-3 text-sm leading-6 text-amber-700">
                Backup codes bloqueados até{" "}
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
                segredo manual. Depois confirme com o código gerado.
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
                      Não foi possível montar o QR code. Use o segredo manual ao lado.
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
                  Desativar 2FA com segurança
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  Se precisar remover essa proteção, confirme com o código atual
                  do autenticador ou com um backup code válido.
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
                      placeholder="Backup code de recuperação"
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
                Guarde estes codigos em um local seguro. Cada código funciona
                uma única vez.
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
              Depois de ativar o autenticador, a conta passa a pedir confirmação
              extra em alterações sensíveis e você continua com backup codes
              para emergencias.
            </p>
          </div>

          {autenticadorAtivo ? (
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-bold text-zinc-950">
                Perdeu acesso ao aplicativo autenticador?
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                Abra uma solicitação segura para recuperação. A equipe pode pedir
                confirmação da titularidade e o processo pode levar até 24 horas
                por segurança.
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
                Abrir recuperação segura
              </button>
            </div>
          ) : null}
        </div>
      </AppModal>
    </>
  );
}
