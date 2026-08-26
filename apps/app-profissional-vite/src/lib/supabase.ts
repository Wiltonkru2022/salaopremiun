type RealtimeCallback = () => void;

type LocalChannel = {
  on: (
    _type: string,
    _filter: Record<string, unknown>,
    callback: RealtimeCallback
  ) => LocalChannel;
  subscribe: () => LocalChannel;
  __dispose: () => void;
};

function createLocalChannel(): LocalChannel {
  const callbacks = new Set<RealtimeCallback>();
  let timer: ReturnType<typeof setInterval> | null = null;

  const channel: LocalChannel = {
    on(_type, _filter, callback) {
      callbacks.add(callback);
      return channel;
    },
    subscribe() {
      if (!timer && typeof window !== "undefined") {
        timer = setInterval(() => {
          if (document.visibilityState === "hidden" || !navigator.onLine) return;
          callbacks.forEach((callback) => {
            try {
              callback();
            } catch {
              // Uma atualização com falha não interrompe as demais.
            }
          });
        }, 30000);
      }
      return channel;
    },
    __dispose() {
      if (timer) clearInterval(timer);
      timer = null;
      callbacks.clear();
    },
  };

  return channel;
}

export const supabaseConfigured = false;

// Compatibilidade temporária para componentes antigos. Não abre conexão,
// autenticação, realtime ou consulta direta no Supabase. Toda sincronização
// ocorre pelas APIs autenticadas do backend, que consultam o Neon.
export const supabase = {
  channel(_name: string) {
    return createLocalChannel();
  },
  async removeChannel(channel: LocalChannel) {
    channel.__dispose();
    return "ok" as const;
  },
  storage: {
    from(bucket: string) {
      return {
        getPublicUrl(path: string) {
          const params = new URLSearchParams({ bucket, path });
          return {
            data: {
              publicUrl: `/api/app-profissional/media/public?${params.toString()}`,
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
