import { NextRequest, NextResponse } from "next/server";
import {
  MonitoringUseCaseError,
  processMonitoringEventUseCase,
} from "@/core/use-cases/monitoring/event";
import { createMonitoringService } from "@/services/monitoringService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await processMonitoringEventUseCase({
      body,
      service: createMonitoringService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof MonitoringUseCaseError) {
      return NextResponse.json({ ok: true }, { status: error.status });
    }

    return NextResponse.json({ ok: true });
  }
}
