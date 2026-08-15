import { afterEach, describe, expect, it } from "vitest";
import {
  clearClientBookingDraft,
  readClientBookingDraft,
  writeClientBookingDraft,
} from "./booking-draft";

const draft = {
  idSalao: "salao-1",
  profissionalId: "profissional-1",
  servicoIds: ["servico-1"],
  selectedDate: "2026-08-20",
  selectedTime: "14:00",
  codigoCupom: "BEMVINDO",
  step: "resumo" as const,
};

afterEach(() => {
  window.sessionStorage.clear();
});

describe("client booking draft", () => {
  it("persists and restores the reservation choices", () => {
    writeClientBookingDraft(draft);

    expect(readClientBookingDraft("salao-1")).toMatchObject(draft);
  });

  it("rejects drafts from another salon", () => {
    writeClientBookingDraft(draft);

    expect(readClientBookingDraft("salao-2")).toBeNull();
  });

  it("clears a draft explicitly", () => {
    writeClientBookingDraft(draft);

    clearClientBookingDraft("salao-1");

    expect(readClientBookingDraft("salao-1")).toBeNull();
  });

  it("removes expired drafts", () => {
    writeClientBookingDraft(draft);
    const key = "sp_cliente_booking_draft:salao-1";
    const stored = JSON.parse(window.sessionStorage.getItem(key) || "{}");
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ ...stored, savedAt: Date.now() - 31 * 60 * 1000 })
    );

    expect(readClientBookingDraft("salao-1")).toBeNull();
    expect(window.sessionStorage.getItem(key)).toBeNull();
  });
});
