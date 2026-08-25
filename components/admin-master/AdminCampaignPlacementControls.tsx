"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type PlacementsPayload = {
  placements?: Record<string, string[]>;
};

function renamePopupLabel(label: HTMLLabelElement) {
  const textNode = Array.from(label.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.includes("App Cliente")
  );

  if (textNode) {
    textNode.textContent = " App Cliente — Popup";
    return;
  }

  label.append(document.createTextNode(" App Cliente — Popup"));
}

function addMenuPlacement(
  input: HTMLInputElement,
  menuChecked: boolean
) {
  if (input.dataset.clientPlacementUpgraded === "1") return;
  const label = input.closest("label");
  if (!(label instanceof HTMLLabelElement)) return;

  input.dataset.clientPlacementUpgraded = "1";
  renamePopupLabel(label);

  const menuLabel = document.createElement("label");
  menuLabel.className = label.className;
  menuLabel.dataset.clientMenuPlacement = "1";

  const menuInput = document.createElement("input");
  menuInput.type = "checkbox";
  menuInput.name = "locais_exibicao";
  menuInput.value = "app_cliente_menu";
  menuInput.checked = menuChecked;
  menuInput.defaultChecked = menuChecked;

  menuLabel.append(menuInput, document.createTextNode(" App Cliente — Menu"));
  label.after(menuLabel);
}

export default function AdminCampaignPlacementControls() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/admin-master/parcerias") return;

    let cancelled = false;

    async function upgrade() {
      try {
        const response = await fetch(
          "/api/admin-master/parcerias/campanhas/placements",
          { cache: "no-store" }
        );
        if (!response.ok) return;

        const payload = (await response.json()) as PlacementsPayload;
        if (cancelled) return;
        const placements = payload.placements || {};

        const inputs = document.querySelectorAll<HTMLInputElement>(
          'input[name="locais_exibicao"][value="app_cliente"]'
        );

        inputs.forEach((input) => {
          const form = input.form || input.closest("form");
          const idCampanha = form
            ?.querySelector<HTMLInputElement>('input[name="id_campanha"]')
            ?.value.trim();
          const menuChecked = Boolean(
            idCampanha && placements[idCampanha]?.includes("app_cliente_menu")
          );
          addMenuPlacement(input, menuChecked);
        });
      } catch {
        // Mantém o formulário original intacto se não for possível carregar a configuração.
      }
    }

    void upgrade();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
