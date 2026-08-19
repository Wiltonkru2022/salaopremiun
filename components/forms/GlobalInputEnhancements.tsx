"use client";

import { Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyInputMask,
  detectInputMask,
  maxLengthForMask,
  normalizeMaskedValue,
  type InputMaskKind,
} from "@/lib/utils/input-masks";

type PasswordOverlay = {
  key: string;
  input: HTMLInputElement;
  left: number;
  top: number;
  height: number;
  visible: boolean;
};

function getInputLabel(input: HTMLInputElement) {
  const associatedLabel = input.labels?.[0]?.textContent?.trim();
  if (associatedLabel) return associatedLabel;

  const wrappingLabel = input.closest("label")?.textContent?.trim();
  if (wrappingLabel) return wrappingLabel;

  const parent = input.parentElement;
  if (!parent) return "";
  const sibling = Array.from(parent.children).find(
    (child) => child instanceof HTMLLabelElement
  );
  return sibling?.textContent?.trim() || "";
}

function getMaskKind(input: HTMLInputElement): InputMaskKind | null {
  return detectInputMask({
    name: input.name,
    id: input.id,
    label: getInputLabel(input),
    placeholder: input.placeholder,
    autoComplete: input.autocomplete,
    type: input.type,
  });
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
}

function prepareMaskedInput(input: HTMLInputElement, kind: InputMaskKind) {
  if (kind === "birthdate" && input.type === "date") return false;
  if (["text", "tel", "search", "number"].includes(input.type)) {
    if (input.type === "number") input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = maxLengthForMask(kind);
  }
  return true;
}

function applyMaskToElement(input: HTMLInputElement, notifyReact: boolean) {
  const kind = getMaskKind(input);
  if (!kind || !prepareMaskedInput(input, kind)) return;

  const masked = applyInputMask(kind, input.value);
  if (masked === input.value) return;

  setNativeInputValue(input, masked);
  if (notifyReact) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function hasExistingPasswordToggle(input: HTMLInputElement) {
  const container = input.parentElement;
  if (!container) return false;
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
  return buttons.some((button) => {
    const description = `${button.getAttribute("aria-label") || ""} ${button.title || ""}`.toLowerCase();
    return /(senha|password)/.test(description) && /(mostrar|ocultar|ver|show|hide)/.test(description);
  });
}

export default function GlobalInputEnhancements() {
  const [passwords, setPasswords] = useState<PasswordOverlay[]>([]);
  const sequenceRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const scanPasswords = useCallback(() => {
    if (typeof document === "undefined") return;

    const candidates = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[type="password"], input[data-sp-password="true"]'
      )
    );

    const next: PasswordOverlay[] = [];
    for (const input of candidates) {
      if (!input.isConnected || input.type === "hidden") continue;
      if (!input.dataset.spPassword && hasExistingPasswordToggle(input)) continue;

      input.dataset.spPassword = "true";
      if (!input.dataset.spPasswordKey) {
        sequenceRef.current += 1;
        input.dataset.spPasswordKey = `sp-password-${sequenceRef.current}`;
      }
      if (!input.style.paddingRight) input.style.paddingRight = "3rem";

      const rect = input.getBoundingClientRect();
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        continue;
      }

      next.push({
        key: input.dataset.spPasswordKey,
        input,
        left: Math.max(rect.left, rect.right - 46),
        top: rect.top,
        height: rect.height,
        visible: input.type === "text",
      });
    }
    setPasswords(next);
  }, []);

  const schedulePasswordScan = useCallback(() => {
    if (typeof window === "undefined") return;
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      scanPasswords();
    });
  }, [scanPasswords]);

  useEffect(() => {
    const onInputCapture = (event: Event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      applyMaskToElement(event.target, false);
    };

    const onFocusCapture = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      applyMaskToElement(event.target, true);
    };

    const onFormData = (event: Event) => {
      const formEvent = event as Event & { formData?: FormData };
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !formEvent.formData) return;

      for (const element of Array.from(form.elements)) {
        if (!(element instanceof HTMLInputElement) || !element.name) continue;
        const kind = getMaskKind(element);
        if (!kind || kind === "birthdate") continue;
        formEvent.formData.set(
          element.name,
          normalizeMaskedValue(kind, element.value)
        );
      }
    };

    document.addEventListener("input", onInputCapture, true);
    document.addEventListener("focusin", onFocusCapture, true);
    document.addEventListener("formdata", onFormData as EventListener, true);

    const observer = new MutationObserver(schedulePasswordScan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["type"],
    });

    window.addEventListener("resize", schedulePasswordScan);
    document.addEventListener("scroll", schedulePasswordScan, true);
    schedulePasswordScan();

    return () => {
      document.removeEventListener("input", onInputCapture, true);
      document.removeEventListener("focusin", onFocusCapture, true);
      document.removeEventListener("formdata", onFormData as EventListener, true);
      observer.disconnect();
      window.removeEventListener("resize", schedulePasswordScan);
      document.removeEventListener("scroll", schedulePasswordScan, true);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [schedulePasswordScan]);

  function togglePassword(item: PasswordOverlay) {
    if (!item.input.isConnected) return;
    item.input.type = item.input.type === "password" ? "text" : "password";
    item.input.focus({ preventScroll: true });
    schedulePasswordScan();
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483000]" aria-hidden="false">
      {passwords.map((item) => (
        <button
          key={item.key}
          type="button"
          className="pointer-events-auto fixed flex items-center justify-center rounded-r-xl text-zinc-500 transition hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-zinc-700"
          style={{
            left: item.left,
            top: item.top,
            width: 46,
            height: item.height,
          }}
          aria-label={item.visible ? "Ocultar senha" : "Mostrar senha"}
          title={item.visible ? "Ocultar senha" : "Mostrar senha"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => togglePassword(item)}
        >
          {item.visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      ))}
    </div>
  );
}
