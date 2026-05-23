import "server-only";

export async function ensureRecoveryCoupons(idSalao: string) {
  void idSalao;
}

export async function processInactiveClientRecovery(limitSaloes = 20) {
  void limitSaloes;

  return {
    checked: 0,
    queued: 0,
    disabled: true,
  };
}
