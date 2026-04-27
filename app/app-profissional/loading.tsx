import AppLoading from "@/components/ui/AppLoading";

export default function AppProfissionalLoading() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff7df_0,#f5f5f5_36%,#eceff3_100%)] p-4">
      <div className="mx-auto max-w-4xl pt-8">
        <AppLoading
          title="Carregando area profissional"
          message="Aguarde enquanto montamos sua agenda, atalhos e indicadores do dia."
          theme="profissional"
          fullHeight={false}
        />
      </div>
    </div>
  );
}
