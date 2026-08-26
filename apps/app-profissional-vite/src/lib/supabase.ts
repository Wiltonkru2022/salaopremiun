type RealtimeCallback = () => void;

type LocalChannel = {
  on: (
    _type: string,
    _filter: Record<string, unknown>,
    callback: RealtimeCallback
  ) => LocalChannel;
  subscribe: () => LocalChannel;
};

function createLocalChannel(): LocalChannel {
  return {
    on(_type, _filter, _callback) {
      // O App Profissional nao abre conexao direta com o banco. Atualizacoes
      // sao obtidas pelas APIs autenticadas do backend (Neon) e pelos eventos
      // de foco/online ja existentes no app.
      return this;
    },
    subscribe() {
      return this;
    },
  };
}

export const supabaseConfigured = false;

// Compatibilidade temporaria apenas para componentes antigos que ainda chamam
// channel/removeChannel/storage. Nenhuma URL, chave, Auth, Realtime ou banco
// Supabase e carregado no navegador.
export const supabase = {
  channel(_name: string) {
    return createLocalChannel();
  },
  async removeChannel(_channel: LocalChannel) {
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
