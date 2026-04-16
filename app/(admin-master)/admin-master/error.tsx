"use client";

export default function AdminMasterError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="rounded-[30px] border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
      <h2 className="font-display text-2xl font-black">
        Erro no AdminMaster
      </h2>
      <p className="mt-2 text-sm">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white"
      >
        Tentar novamente
      </button>
    </div>
  );
}
