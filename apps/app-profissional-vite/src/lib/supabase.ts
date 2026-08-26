import { resolvePublicMediaUrl } from "./media";

// Legacy adapter kept only until all UI imports are renamed. No external backend SDK is used.
export const supabase = {
  storage: {
    from(_bucket?: string) {
      return { getPublicUrl(path: string) { return { data: { publicUrl: resolvePublicMediaUrl(path) } }; } };
    },
  },
};
