import { resolvePublicMediaUrl } from "./media";

// Adaptador local temporário de mídia. Não conecta banco, autenticação ou realtime.
export const supabase = {
  storage: {
    from(_bucket?: string) {
      return { getPublicUrl(path: string) { return { data: { publicUrl: resolvePublicMediaUrl(path) } }; } };
    },
  },
};
