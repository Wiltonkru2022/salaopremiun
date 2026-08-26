import "server-only";

import { getDatabaseAdmin } from "@/lib/db/admin";

export type NativePushAudience = "cliente_app" | "profissional_app" | "salao_painel";

export type NativePushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  timestamp?: number;
};

export type NativePushDeviceRow = {
  id: string;
  audience: NativePushAudience;
  fcm_token: string;
  platform: "android" | "ios";
  failure_count?: number | null;
};

export type NativePushDeliveryFailure = {
  deviceId: string;
  errorCode: string;
  message: string;
};

export type NativePushSendResult = {
  attempted: number;
  sent: number;
  failed: number;
  ignored: number;
  errors: NativePushDeliveryFailure[];
};

type FirebaseCredential = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const FIREBASE_APP_NAME = "salaopremiun-native-push";
const DEFAULT_ANDROID_CHANNEL_ID = "salaopremiun_default";
const TOKEN_MIN_LENGTH = 20;
const TOKEN_MAX_LENGTH = 4096;
const ERROR_MESSAGE_MAX_LENGTH = 1000;

function emptyResult(): NativePushSendResult {
  return { attempted: 0, sent: 0, failed: 0, ignored: 0, errors: [] };
}

function sanitizeText(value: unknown, fallback = "") {
  return String(value ?? "").trim() || fallback;
}

function sanitizeId(value?: string | null) {
  const parsed = sanitizeText(value);
  return parsed || null;
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function parseServiceAccountJson(raw: string): FirebaseCredential | null {
  try {
    const parsed = JSON.parse(raw) as {
      project_id?: unknown;
      client_email?: unknown;
      private_key?: unknown;
    };
    const projectId = sanitizeText(parsed.project_id);
    const clientEmail = sanitizeText(parsed.client_email);
    const privateKey = normalizePrivateKey(sanitizeText(parsed.private_key));
    if (!projectId || !clientEmail || !privateKey) return null;
    return { projectId, clientEmail, privateKey };
  } catch {
    return null;
  }
}

function getFirebaseCredential(): FirebaseCredential | null {
  const serviceAccountJson = sanitizeText(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (serviceAccountJson) {
    const parsed = parseServiceAccountJson(serviceAccountJson);
    if (parsed) return parsed;
  }

  const encodedPrivateKey = sanitizeText(process.env.FIREBASE_PRIVATE_KEY_BASE64);
  const privateKeyFromBase64 = encodedPrivateKey
    ? Buffer.from(encodedPrivateKey, "base64").toString("utf8")
    : "";

  const projectId = sanitizeText(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = sanitizeText(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(
    sanitizeText(process.env.FIREBASE_PRIVATE_KEY || privateKeyFromBase64)
  );

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function isNativePushConfigured() {
  return Boolean(getFirebaseCredential());
}

async function getFirebaseMessaging() {
  const credential = getFirebaseCredential();
  if (!credential) return null;

  const [{ cert, getApp, getApps, initializeApp }, { getMessaging }] =
    await Promise.all([import("firebase-admin/app"), import("firebase-admin/messaging")]);

  const app =
    getApps().find((item) => item.name === FIREBASE_APP_NAME) ||
    (() => {
      try {
        return getApp(FIREBASE_APP_NAME);
      } catch {
        return initializeApp(
          {
            credential: cert({
              projectId: credential.projectId,
              clientEmail: credential.clientEmail,
              privateKey: credential.privateKey,
            }),
          },
          FIREBASE_APP_NAME
        );
      }
    })();

  return getMessaging(app);
}

function normalizePlatform(value: unknown): "android" | "ios" {
  return value === "ios" ? "ios" : "android";
}

function sanitizeToken(value: unknown) {
  const token = sanitizeText(value);
  if (token.length < TOKEN_MIN_LENGTH || token.length > TOKEN_MAX_LENGTH) {
    throw new Error("Token FCM invalido.");
  }
  return token;
}

export async function upsertNativePushDevice(params: {
  audience: NativePushAudience;
  fcmToken: unknown;
  platform?: unknown;
  appId?: string | null;
  idSalao?: string | null;
  idUsuario?: string | null;
  idProfissional?: string | null;
  clienteAppContaId?: string | null;
  userAgent?: string | null;
  appVersion?: string | null;
  deviceModel?: string | null;
}) {
  const fcmToken = sanitizeToken(params.fcmToken);
  const now = new Date().toISOString();

  const { error } = await (getDatabaseAdmin() as any)
    .from("native_push_devices")
    .upsert(
      {
        audience: params.audience,
        fcm_token: fcmToken,
        platform: normalizePlatform(params.platform),
        app_id: sanitizeId(params.appId),
        id_salao: sanitizeId(params.idSalao),
        id_usuario: sanitizeId(params.idUsuario),
        id_profissional: sanitizeId(params.idProfissional),
        cliente_app_conta_id: sanitizeId(params.clienteAppContaId),
        user_agent: sanitizeId(params.userAgent),
        app_version: sanitizeId(params.appVersion),
        device_model: sanitizeId(params.deviceModel),
        ativo: true,
        ultimo_uso_em: now,
        last_error_code: null,
        last_error_message: null,
        updated_at: now,
      },
      { onConflict: "audience,fcm_token" }
    );

  if (error) throw new Error(error.message);
}

export async function listNativePushDevices(params: {
  audience: NativePushAudience;
  idSalao?: string | null;
  idUsuario?: string | null;
  idProfissional?: string | null;
  clienteAppContaId?: string | null;
}) {
  let query = (getDatabaseAdmin() as any)
    .from("native_push_devices")
    .select("id, audience, fcm_token, platform, failure_count")
    .eq("ativo", true)
    .eq("audience", params.audience);

  if (params.audience === "cliente_app") {
    if (!params.clienteAppContaId) return [];
    query = query.eq("cliente_app_conta_id", params.clienteAppContaId);
  } else if (params.audience === "profissional_app") {
    if (!params.idSalao || !params.idProfissional) return [];
    query = query
      .eq("id_salao", params.idSalao)
      .eq("id_profissional", params.idProfissional);
  } else {
    if (!params.idSalao) return [];
    query = query.eq("id_salao", params.idSalao);
    if (params.idUsuario) query = query.eq("id_usuario", params.idUsuario);
  }

  const { data, error } = await query.limit(1000);
  if (error || !data?.length) return [];
  return data as NativePushDeviceRow[];
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, ERROR_MESSAGE_MAX_LENGTH);
  }
  if (typeof error === "object" && error !== null) {
    const message = String(
      (error as { message?: unknown; errorInfo?: { message?: unknown } }).message ||
        (error as { errorInfo?: { message?: unknown } }).errorInfo?.message ||
        ""
    ).trim();
    if (message) return message.slice(0, ERROR_MESSAGE_MAX_LENGTH);
  }
  return "Falha desconhecida ao enviar FCM.";
}

function getErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return "unknown";
  const candidate =
    (error as { code?: unknown }).code ||
    (error as { errorInfo?: { code?: unknown } }).errorInfo?.code ||
    "unknown";
  return sanitizeText(candidate, "unknown").slice(0, 160);
}

function shouldDeactivateDevice(errorCode: string, message: string) {
  const normalized = `${errorCode} ${message}`.toLowerCase();
  return (
    normalized.includes("registration-token-not-registered") ||
    normalized.includes("invalid-registration-token") ||
    normalized.includes("requested entity was not found")
  );
}

async function recordNativeDelivery(params: {
  row: NativePushDeviceRow;
  payload: NativePushPayload;
  status: "enviada" | "falhou" | "ignorada";
  errorCode?: string | null;
  errorMessage?: string | null;
  deactivateDevice?: boolean;
}) {
  try {
    const database = getDatabaseAdmin() as any;
    const now = new Date().toISOString();

    if (params.status === "enviada") {
      await database
        .from("native_push_devices")
        .update({
          ativo: true,
          ultimo_uso_em: now,
          last_success_at: now,
          last_error_code: null,
          last_error_message: null,
          failure_count: 0,
          updated_at: now,
        })
        .eq("id", params.row.id);
    } else if (params.status === "falhou") {
      const update: Record<string, unknown> = {
        last_failure_at: now,
        last_error_code: params.errorCode || null,
        last_error_message: params.errorMessage || "Falha ao enviar FCM.",
        failure_count: Math.max(0, Number(params.row.failure_count || 0)) + 1,
        updated_at: now,
      };
      if (params.deactivateDevice) update.ativo = false;

      await database.from("native_push_devices").update(update).eq("id", params.row.id);
    }

    await database.from("push_delivery_log").insert({
      push_subscription_id: null,
      audience: params.row.audience,
      endpoint_host: "fcm.googleapis.com",
      notification_tag: params.payload.tag || null,
      title: params.payload.title || null,
      status: params.status,
      http_status: null,
      error_message: params.errorMessage || null,
      created_at: now,
    });
  } catch (diagnosticError) {
    console.error("[native-push] falha ao registrar diagnostico", {
      deviceId: params.row.id,
      message: normalizeErrorMessage(diagnosticError),
    });
  }
}

function buildDataPayload(payload: NativePushPayload) {
  return {
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    tag: payload.tag || "salaopremiun-update",
    timestamp: String(payload.timestamp || Date.now()),
  };
}

async function recordConfigurationFailure(
  rows: NativePushDeviceRow[],
  payload: NativePushPayload,
  message: string
): Promise<NativePushSendResult> {
  await Promise.all(
    rows.map((row) =>
      recordNativeDelivery({
        row,
        payload,
        status: "falhou",
        errorCode: "native-push/unconfigured",
        errorMessage: message,
      })
    )
  );

  return {
    attempted: rows.length,
    sent: 0,
    failed: rows.length,
    ignored: 0,
    errors: rows.map((row) => ({
      deviceId: row.id,
      errorCode: "native-push/unconfigured",
      message,
    })),
  };
}

export async function sendNativePushToRows(
  rows: NativePushDeviceRow[],
  payload: NativePushPayload
): Promise<NativePushSendResult> {
  if (!rows.length) return emptyResult();

  const uniqueRows = Array.from(new Map(rows.map((row) => [row.fcm_token, row])).values());
  const normalizedPayload: NativePushPayload = {
    ...payload,
    title: sanitizeText(payload.title, "SalaoPremiun"),
    body: sanitizeText(payload.body, "Voce tem uma nova notificacao."),
    url: sanitizeText(payload.url, "/"),
    timestamp: payload.timestamp || Date.now(),
  };

  const messaging = await getFirebaseMessaging().catch(() => null);
  if (!messaging) {
    return recordConfigurationFailure(
      uniqueRows,
      normalizedPayload,
      "Native Push nao configurado: informe as credenciais Firebase Admin na Vercel."
    );
  }

  let sent = 0;
  let failed = 0;
  const errors: NativePushDeliveryFailure[] = [];

  await Promise.all(
    uniqueRows.map(async (row) => {
      try {
        await messaging.send({
          token: row.fcm_token,
          notification: {
            title: normalizedPayload.title,
            body: normalizedPayload.body,
          },
          data: buildDataPayload(normalizedPayload),
          android: {
            priority: "high",
            notification: {
              channelId: DEFAULT_ANDROID_CHANNEL_ID,
              tag: normalizedPayload.tag || undefined,
            },
          },
        });

        sent += 1;
        await recordNativeDelivery({
          row,
          payload: normalizedPayload,
          status: "enviada",
        });
      } catch (error) {
        const errorCode = getErrorCode(error);
        const message = normalizeErrorMessage(error);
        failed += 1;
        errors.push({ deviceId: row.id, errorCode, message });
        await recordNativeDelivery({
          row,
          payload: normalizedPayload,
          status: "falhou",
          errorCode,
          errorMessage: message,
          deactivateDevice: shouldDeactivateDevice(errorCode, message),
        });
      }
    })
  );

  return {
    attempted: uniqueRows.length,
    sent,
    failed,
    ignored: 0,
    errors,
  };
}

export async function sendNativePushToAudience(params: {
  audience: NativePushAudience;
  idSalao?: string | null;
  idUsuario?: string | null;
  idProfissional?: string | null;
  clienteAppContaId?: string | null;
  payload: NativePushPayload;
}) {
  const rows = await listNativePushDevices(params);
  return sendNativePushToRows(rows, params.payload);
}
