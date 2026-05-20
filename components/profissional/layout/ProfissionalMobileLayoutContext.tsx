"use client";

import { createContext, useContext } from "react";

export type ProfissionalMobileChromeState = {
  title?: string;
  subtitle?: string;
  showBottomNav: boolean;
};

export type ProfissionalMobileLayoutContextValue = {
  setChrome: (state: ProfissionalMobileChromeState) => void;
};

export const ProfissionalMobileLayoutContext =
  createContext<ProfissionalMobileLayoutContextValue | null>(null);

export function useProfissionalMobileLayout() {
  return useContext(ProfissionalMobileLayoutContext);
}
