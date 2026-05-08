import AppLoading from "@/components/ui/AppLoading";

export default function PainelLoading() {
  return (
    <AppLoading
      title="Carregando painel"
      message="Aguarde enquanto preparamos sua área de trabalho com os dados mais recentes."
      theme="painel"
      fullHeight={false}
    />
  );
}
