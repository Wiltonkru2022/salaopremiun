"use client";

import { useEffect } from "react";

export default function PanelFormPendingGuard() {
  useEffect(() => {
    function onSubmit(event: Event) {
      const submitEvent = event as SubmitEvent;
      const submitter = submitEvent.submitter;
      if (!(submitter instanceof HTMLButtonElement)) return;
      if (submitter.getAttribute("aria-busy") !== null) return;
      if (submitter.disabled) return;

      const previousDisabled = submitter.disabled;
      submitter.dataset.panelAutoPending = "true";
      submitter.style.setProperty(
        "--panel-pending-color",
        window.getComputedStyle(submitter).color
      );
      submitter.disabled = true;
      submitter.setAttribute("aria-busy", "true");

      window.setTimeout(() => {
        if (!submitter.isConnected) return;
        if (submitter.dataset.panelAutoPending !== "true") return;
        delete submitter.dataset.panelAutoPending;
        submitter.disabled = previousDisabled;
        submitter.removeAttribute("aria-busy");
        submitter.style.removeProperty("--panel-pending-color");
      }, 15000);
    }

    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  return (
    <style jsx global>{`
      button[data-panel-auto-pending="true"] {
        position: relative;
        pointer-events: none;
        color: transparent !important;
        opacity: 0.72;
      }

      button[data-panel-auto-pending="true"] > * {
        opacity: 0 !important;
      }

      button[data-panel-auto-pending="true"]::after {
        content: "Processando...";
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--panel-pending-color, currentColor);
        font: inherit;
      }
    `}</style>
  );
}
