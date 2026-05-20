"use client";

import { createContext, useContext } from "react";

export type ClientMobileChromeState = {
  title: string;
  subtitle: string;
};

export type ClientMobileLayoutContextValue = {
  setChrome: (state: ClientMobileChromeState) => void;
};

export const ClientMobileLayoutContext =
  createContext<ClientMobileLayoutContextValue | null>(null);

export function useClientMobileLayout() {
  return useContext(ClientMobileLayoutContext);
}
