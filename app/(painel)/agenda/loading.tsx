import AppLoading from "@/components/ui/AppLoading";

export default function Loading() {
  return (
    <AppLoading
      title="Abrindo agenda"
      message="Carregando profissionais, grade e atendimentos para você entrar mais rápido."
      fullHeight={false}
    />
  );
}
