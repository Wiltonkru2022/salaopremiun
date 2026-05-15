"use client";

import { useEffect } from "react";

const REPAINT_CLASS = "sp-mobile-resume-repaint";

export default function MobileViewportRuntime() {
  useEffect(() => {
    let repaintTimeout: number | null = null;

    function applyViewportVars() {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty(
        "--sp-vh",
        `${height * 0.01}px`
      );
    }

    function repaintFixedBars() {
      applyViewportVars();
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

    applyViewportVars();

    window.visualViewport?.addEventListener("resize", applyViewportVars);
    window.visualViewport?.addEventListener("scroll", applyViewportVars);
    window.addEventListener("resize", applyViewportVars);
    window.addEventListener("focus", repaintFixedBars);
    window.addEventListener("pageshow", repaintFixedBars);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      if (repaintTimeout) {
        window.clearTimeout(repaintTimeout);
      }
      document.documentElement.classList.remove(REPAINT_CLASS);
      window.visualViewport?.removeEventListener("resize", applyViewportVars);
      window.visualViewport?.removeEventListener("scroll", applyViewportVars);
      window.removeEventListener("resize", applyViewportVars);
      window.removeEventListener("focus", repaintFixedBars);
      window.removeEventListener("pageshow", repaintFixedBars);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  return null;
}
