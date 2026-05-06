export function isVideoMedia(value?: string | null) {
  const media = String(value || "").trim().toLowerCase();
  return (
    media.startsWith("data:video/") ||
    media.startsWith("blob:") ||
    /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(media)
  );
}
