import { resolvePublicMediaUrl } from "./media";

// Adaptador local de URL publica; os arquivos sao entregues pelo Cloudinary.
export const database = {
  storage: {
    from(_collection?: string) {
      return {
        getPublicUrl(path: string) {
          return { data: { publicUrl: resolvePublicMediaUrl(path) } };
        },
      };
    },
  },
};
