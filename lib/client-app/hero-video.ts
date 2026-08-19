import heroVideoPartA from "@/lib/client-app/hero-video/base64-a";
import heroVideoPartB from "@/lib/client-app/hero-video/base64-b";

/**
 * Vídeo curto e otimizado usado no hero do App Cliente.
 * Mantido como data URI para não depender de storage externo.
 */
export const CLIENT_APP_HERO_VIDEO_SRC =
  `data:video/mp4;base64,${heroVideoPartA}${heroVideoPartB}`;
