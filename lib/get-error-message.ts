export function getErrorMessage(
  error: unknown,
  fallback = "Ocorreu um erro inesperado."
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.trim()
  ) {
    return (error as { message: string }).message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}
