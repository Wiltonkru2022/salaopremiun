"use client";

import { useEffect } from "react";
import type { MonitoringActorType, MonitoringSurface } from "@/lib/monitoring/types";
import { setClientMonitoringContext } from "@/lib/monitoring/client";

export default function MonitoringContextBridge(props: {
  actorType: MonitoringActorType;
  surface: MonitoringSurface;
  idSalao?: string | null;
  idUsuario?: string | null;
  idAdminUsuario?: string | null;
}) {
  useEffect(() => {
    setClientMonitoringContext({
      actorType: props.actorType,
      surface: props.surface,
      idSalao: props.idSalao || null,
      idUsuario: props.idUsuario || null,
      idAdminUsuario: props.idAdminUsuario || null,
    });
  }, [props.actorType, props.idAdminUsuario, props.idSalao, props.idUsuario, props.surface]);

  return null;
}
