"use client";

import { useEffect } from "react";

type CampaignClickTrackerProps = {
  idCampanha: string;
  idSalao: string;
  origem: string;
  slug?: string;
  token?: string;
};

export default function CampaignClickTracker({
  idCampanha,
  idSalao,
  origem,
  slug,
  token,
}: CampaignClickTrackerProps) {
  useEffect(() => {
    if (!idCampanha || !idSalao) return;

    const key = `campanha-click:${idCampanha}:${origem}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");

    const body = JSON.stringify({
      idCampanha,
      idSalao,
      origem,
      slug,
      token,
      href: window.location.href,
      referrer: document.referrer || null,
      userAgent: window.navigator.userAgent || null,
    });

    const url = "/api/campanhas/clique";
    const beaconSent =
      "sendBeacon" in navigator &&
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));

    if (!beaconSent) {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => null);
    }
  }, [idCampanha, idSalao, origem, slug, token]);

  return null;
}
