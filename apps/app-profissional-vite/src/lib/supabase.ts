import { resolvePublicMediaUrl } from "./media";

// Adaptador local de mídia. Não conecta a nenhum serviço externo de banco/auth.
export const supabase = {
  storage: {
    from(_bucket?: string) {
      return { getPublicUrl(path: string) { return { data: { publicUrl: resolvePublicMediaUrl(path) } }; } };
    },
  },
};
