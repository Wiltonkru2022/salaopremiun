import AppLoading from "@/components/ui/AppLoading";

export default function Loading() {
  return (
    <AppLoading
      title="Abrindo agenda"
      message="Carregando profissionais, grade e atendimentos para voce entrar mais rapido."
      fullHeight={false}
    />
  );
}
