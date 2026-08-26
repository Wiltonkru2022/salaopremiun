type RealtimeChannel = {
  on: (...args: unknown[]) => RealtimeChannel;
  subscribe: (callback?: (status: string) => void) => RealtimeChannel;
  unsubscribe: () => Promise<string>;
};

function createNoopChannel(): RealtimeChannel {
  const channel: RealtimeChannel = {
    on() {
      return channel;
    },
    subscribe(callback) {
      callback?.("SUBSCRIBED");
      return channel;
    },
    async unsubscribe() {
      return "ok";
    },
  };
  return channel;
}

export const supabaseConfigured = true;

// Nome mantido somente para compatibilidade de imports antigos.
// O App Profissional usa APIs server-side com sessão interna + Neon.
// Não existe conexão com Supabase Auth, Database ou Realtime neste módulo.
export const supabase = {
  channel() {
    return createNoopChannel();
  },
  async removeChannel(channel: RealtimeChannel) {
    await channel.unsubscribe();
    return "ok";
  },
  storage: {
    from() {
      return {
        getPublicUrl(path: string) {
          const value = String(path || "").trim();
          return {
            data: {
              publicUrl: /^https:\/\//i.test(value) ? value : "",
            },
          };
        },
      };
    },
  },
};

export function cpfToAuthEmail(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  return `${digits}@profissional.salaopremiun.local`;
}
