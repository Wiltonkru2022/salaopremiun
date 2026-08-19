"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function PainelDesktopGuard({ children }: Props) {
  return <>{children}</>;
}
