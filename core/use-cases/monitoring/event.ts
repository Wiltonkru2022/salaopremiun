import {
  MonitoringServiceError,
  type MonitoringRoutePayload,
  type MonitoringService,
} from "@/services/monitoringService";

export class MonitoringUseCaseError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "MonitoringUseCaseError";
  }
}

export async function processMonitoringEventUseCase(params: {
  body: unknown;
  service: MonitoringService;
}) {
  try {
    const body = (params.body || {}) as MonitoringRoutePayload;
    const shouldResolveIdentity =
      (!body.idSalao && !body.idUsuario && !body.idAdminUsuario) &&
      (body.kind === "error" || body.severity === "warning" || body.severity === "error" || body.severity === "critical");

    const identity = shouldResolveIdentity
      ? await params.service.resolveMonitoringIdentity()
      : {
          idSalao: null,
          idUsuario: null,
          idAdminUsuario: null,
        };

    const payload = {
      ...body,
      idSalao: identity.idSalao || body.idSalao || null,
      idUsuario: identity.idUsuario || body.idUsuario || null,
      idAdminUsuario: identity.idAdminUsuario || body.idAdminUsuario || null,
    };

    if (body.kind === "metric") {
      await params.service.captureMetric(payload);
    } else if (body.kind === "error") {
      await params.service.captureError(payload);
    } else {
      await params.service.captureEvent(payload);
    }

    return {
      status: 200,
      body: { ok: true },
    };
  } catch (error) {
    await params.service.reportRouteFailure(error);

    if (error instanceof MonitoringUseCaseError) {
      throw error;
    }

    if (error instanceof MonitoringServiceError) {
      throw new MonitoringUseCaseError(error.message, error.status);
    }

    return {
      status: 200,
      body: { ok: true },
    };
  }
}
