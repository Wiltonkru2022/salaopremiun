export function publicAsset(path: string) {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${cleanPath}`;
}
