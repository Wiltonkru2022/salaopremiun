"use client";

import { useEffect } from "react";
import { clearClientBookingDraft } from "@/lib/client-app/booking-draft";

export default function ClientBookingDraftCleanup({
  idSalao,
}: {
  idSalao?: string | null;
}) {
  useEffect(() => {
    if (idSalao) clearClientBookingDraft(idSalao);
  }, [idSalao]);

  return null;
}
