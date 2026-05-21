"use client";

import { useEffect } from "react";

const REPAINT_CLASS = "sp-mobile-resume-repaint";

export default function MobileViewportRuntime() {
  useEffect(() => {
    let repaintTimeout: number | null = null;
    const settleTimers: number[] = [];

    function isEditableElement(value: Element | null) {
      if (!value) return false;
      const tagName = value.tagName.toLowerCase();
      return (
        tagName === "input" ||
        tagName === "select" ||
        tagName === "textarea" ||
        value.getAttribute("contenteditable") === "true"
      );
    }

    function applyViewportVars() {
      const viewport = window.visualViewport;
      const height = viewport?.height || window.innerHeight;
      const bottomOffset =
        viewport && isEditableElement(document.activeElement)
          ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
          : 0;

      document.documentElement.style.setProperty(
        "--sp-vh",
        `${height * 0.01}px`
      );
      document.documentElement.style.setProperty(
        "--sp-fixed-bottom",
        `${bottomOffset}px`
      );
    }

    function scheduleViewportSettle() {
      applyViewportVars();
      window.requestAnimationFrame(applyViewportVars);

      [120, 360, 900].forEach((delay) => {
        const timer = window.setTimeout(applyViewportVars, delay);
        settleTimers.push(timer);
      });
    }

    function repaintFixedBars() {
      scheduleViewportSettle();
      document.documentElement.classList.add(REPAINT_CLASS);

      if (repaintTimeout) {
        window.clearTimeout(repaintTimeout);
      }

      repaintTimeout = window.setTimeout(() => {
        document.documentElement.classList.remove(REPAINT_CLASS);
      }, 180);
    }

    function handleVisible() {
      if (document.visibilityState === "visible") {
        repaintFixedBars();
      }
    }

    scheduleViewportSettle();

    window.visualViewport?.addEventListener("resize", applyViewportVars);
    window.visualViewport?.addEventListener("scroll", applyViewportVars);
    window.addEventListener("resize", applyViewportVars);
    window.addEventListener("orientationchange", repaintFixedBars);
    window.addEventListener("focus", repaintFixedBars);
    window.addEventListener("blur", repaintFixedBars);
    window.addEventListener("pageshow", repaintFixedBars);
    document.addEventListener("focusin", repaintFixedBars);
    document.addEventListener("focusout", repaintFixedBars);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      if (repaintTimeout) {
        window.clearTimeout(repaintTimeout);
      }
      settleTimers.forEach((timer) => window.clearTimeout(timer));
      document.documentElement.classList.remove(REPAINT_CLASS);
      window.visualViewport?.removeEventListener("resize", applyViewportVars);
      window.visualViewport?.removeEventListener("scroll", applyViewportVars);
      window.removeEventListener("resize", applyViewportVars);
      window.removeEventListener("orientationchange", repaintFixedBars);
      window.removeEventListener("focus", repaintFixedBars);
      window.removeEventListener("blur", repaintFixedBars);
      window.removeEventListener("pageshow", repaintFixedBars);
      document.removeEventListener("focusin", repaintFixedBars);
      document.removeEventListener("focusout", repaintFixedBars);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  return null;
}
