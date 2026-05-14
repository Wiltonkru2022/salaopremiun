import LegalPageLayout from "@/components/legal-page-layout";

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalPageLayout
      title="Politica de Privacidade"
      subtitle="Entenda como o SalaoPremium coleta, utiliza, protege e trata dados pessoais no painel, no app profissional, no app cliente e nas integracoes com Google."
    >
      <p>
        Esta Politica de Privacidade descreve as praticas adotadas pelo
        SalaoPremium no tratamento de dados pessoais de saloes, profissionais,
        clientes finais, administradores e visitantes. O uso da plataforma
        pressupoe a leitura e a concordancia com estas regras, sem prejuizo das
        obrigacoes previstas na legislacao brasileira aplicavel, incluindo a Lei
        Geral de Protecao de Dados Pessoais (LGPD).
      </p>

      <h2>1. Identificacao do app e organizacao</h2>
      <p>
        O SalaoPremium e uma plataforma SaaS para gestao de saloes de beleza,
        agenda, clientes, profissionais, vendas, caixa, notificacoes, app do
        cliente, app profissional e integracoes operacionais. Esta politica se
        aplica ao dominio https://salaopremiun.com.br e seus subdominios
        oficiais, incluindo painel.salaopremiun.com.br, login.salaopremiun.com.br
        e app.salaopremiun.com.br.
      </p>

      <h2>2. Dados que podem ser coletados</h2>
      <p>
        Podemos tratar dados fornecidos diretamente pelo usuario, dados gerados
        durante o uso da plataforma e dados necessarios para seguranca,
        autenticacao e operacao dos servicos.
      </p>
      <ul>
        <li>Dados cadastrais, como nome, e-mail, telefone, endereco e dados do salao.</li>
        <li>Dados de acesso, como credenciais, permissoes, registros de sessao e logs tecnicos.</li>
        <li>Dados operacionais, como agendamentos, servicos, profissionais, clientes, comandas, vendas e notificacoes.</li>
        <li>Dados de comunicacao, como solicitacoes de suporte, mensagens, preferencias e autorizacoes de push.</li>
        <li>Dados tecnicos, como endereco IP, navegador, dispositivo, eventos de seguranca e cookies necessarios.</li>
      </ul>

      <h2>3. Dados do Google acessados pelo SalaoPremium</h2>
      <p>
        Quando o usuario escolhe usar Login com Google ou Google Calendar, o
        SalaoPremium pode solicitar autorizacao para acessar dados da Conta
        Google estritamente necessarios para a funcionalidade escolhida.
      </p>
      <ul>
        <li>
          <strong>Login com Google:</strong> podemos acessar identificador da
          conta Google, nome, e-mail e foto de perfil, quando fornecidos pelo
          Google, para autenticar o usuario no painel do salao.
        </li>
        <li>
          <strong>Google Calendar:</strong> podemos acessar o e-mail da conta
          conectada, tokens de autorizacao e permissoes de calendario para criar,
          atualizar ou recriar eventos de agenda relacionados aos atendimentos
          confirmados do salao.
        </li>
        <li>
          <strong>Escopos OAuth utilizados:</strong> openid, email, profile e
          https://www.googleapis.com/auth/calendar.events.
        </li>
      </ul>
      <p>
        O SalaoPremium nao usa dados do Google para publicidade, venda de dados,
        revenda, corretagem de informacoes, treinamento de modelos de IA ou
        qualquer finalidade incompatibile com a funcionalidade exibida ao usuario.
      </p>

      <h2>4. Como usamos dados do Google</h2>
      <p>
        Os dados do Google sao usados somente para fornecer ou melhorar recursos
        visiveis ao usuario:
      </p>
      <ul>
        <li>permitir login no painel usando uma conta Google previamente vinculada;</li>
        <li>identificar a conta Google conectada ao usuario do salao;</li>
        <li>sincronizar atendimentos confirmados com o Google Calendar;</li>
        <li>atualizar ou recriar eventos do calendario quando um agendamento for alterado;</li>
        <li>manter registros de seguranca, auditoria e suporte relacionados a integracao.</li>
      </ul>
      <p>
        O SalaoPremium nao le, copia ou transfere eventos pessoais do calendario
        que nao sejam necessarios para executar a sincronizacao solicitada pelo
        usuario.
      </p>

      <h2>5. Uso limitado de dados do Google</h2>
      <p>
        O uso e a transferencia de informacoes recebidas das APIs do Google pelo
        SalaoPremium obedecem a Politica de Dados do Usuario dos Servicos de API
        do Google, incluindo os requisitos de Uso Limitado. Os dados do Google
        nao sao usados para publicidade, nao sao vendidos, nao sao compartilhados
        para fins comerciais independentes e nao sao usados para treinar modelos
        de inteligencia artificial.
      </p>

      <h2>6. Finalidades do tratamento</h2>
      <p>
        Os dados sao utilizados para entregar, manter e melhorar a experiencia do
        SalaoPremium. O tratamento ocorre especialmente para:
      </p>
      <ul>
        <li>criar e administrar contas de saloes, profissionais e clientes;</li>
        <li>permitir login, controle de permissoes e recuperacao de acesso;</li>
        <li>operar agenda, cadastro de clientes, servicos, equipe, vendas, caixa e relatorios;</li>
        <li>enviar notificacoes transacionais, avisos de agenda, alertas de seguranca e comunicacoes operacionais;</li>
        <li>prestar suporte, prevenir fraudes, investigar falhas e proteger a plataforma;</li>
        <li>cumprir obrigacoes legais, regulatorias, fiscais ou contratuais.</li>
      </ul>

      <h2>7. Base legal</h2>
      <p>
        O tratamento de dados podera ocorrer com base na execucao de contrato,
        cumprimento de obrigacao legal, legitimo interesse, consentimento,
        exercicio regular de direitos ou outras hipoteses previstas na LGPD,
        conforme a finalidade especifica de cada operacao.
      </p>

      <h2>8. Compartilhamento de dados</h2>
      <p>
        O SalaoPremium nao vende dados pessoais nem dados do Google. O
        compartilhamento pode ocorrer apenas quando necessario para operar a
        plataforma, cumprir exigencias legais ou integrar servicos essenciais,
        como hospedagem, banco de dados, autenticacao, envio de notificacoes,
        processamento financeiro, suporte e monitoramento tecnico.
      </p>
      <p>
        Prestadores e parceiros tecnicos devem atuar de acordo com obrigacoes de
        seguranca, confidencialidade e finalidade compativel com a prestacao do
        servico.
      </p>

      <h2>9. Dados dos clientes cadastrados pelos saloes</h2>
      <p>
        Quando um salao cadastra clientes, agenda servicos ou utiliza recursos do
        app cliente, o salao tambem possui responsabilidade sobre a qualidade, a
        origem e a autorizacao de uso desses dados. O SalaoPremium fornece a
        tecnologia para gestao e tratamento operacional, respeitando as regras da
        plataforma e a legislacao aplicavel.
      </p>

      <h2>10. Seguranca da informacao</h2>
      <p>
        Adotamos medidas tecnicas e administrativas para reduzir riscos de acesso
        nao autorizado, perda, alteracao, divulgacao indevida ou uso inadequado de
        informacoes. Essas medidas incluem autenticacao, controle de permissoes,
        segregacao por salao, monitoramento de eventos, HTTPS, armazenamento
        seguro de credenciais e boas praticas de protecao de tokens.
      </p>
      <p>
        Nenhum ambiente digital e totalmente imune a riscos. Por isso, o usuario
        deve manter senha segura, nao compartilhar acesso e comunicar suspeitas
        de uso indevido.
      </p>

      <h2>11. Cookies e tecnologias semelhantes</h2>
      <p>
        Podemos utilizar cookies e tecnologias semelhantes para manter sessao,
        lembrar preferencias, melhorar desempenho, reforcar seguranca e analisar
        funcionamento da plataforma. Cookies essenciais podem ser necessarios para
        login, navegacao e protecao contra uso indevido.
      </p>

      <h2>12. Retencao, revogacao e exclusao</h2>
      <p>
        Os dados podem ser mantidos pelo periodo necessario para cumprir as
        finalidades descritas nesta politica, preservar historico operacional,
        atender obrigacoes legais, resolver disputas, prevenir fraude ou exercer
        direitos. Quando aplicavel, dados poderao ser anonimizados ou excluidos
        conforme criterios tecnicos e legais.
      </p>
      <p>
        O usuario pode desconectar o Google Calendar ou remover o Login com
        Google pelo Perfil do Salao. Tambem pode revogar o acesso nas
        configuracoes da propria Conta Google. A remocao da integracao interrompe
        novos acessos, sem apagar automaticamente registros operacionais
        necessarios para auditoria, seguranca, obrigacoes legais ou historico do
        salao.
      </p>

      <h2>13. Direitos dos titulares</h2>
      <p>
        Conforme a LGPD, o titular podera solicitar confirmacao de tratamento,
        acesso, correcao, portabilidade, anonimizacao, bloqueio, eliminacao,
        informacao sobre compartilhamento e revisao de consentimentos, observadas
        as limitacoes legais e tecnicas aplicaveis.
      </p>

      <h2>14. Criancas e adolescentes</h2>
      <p>
        A plataforma e destinada a gestao de saloes e a contratacao ou
        acompanhamento de servicos de beleza. Caso dados de menores sejam
        inseridos por um salao, o salao deve assegurar que possui autorizacao
        adequada do responsavel legal quando necessario.
      </p>

      <h2>15. Alteracoes desta politica</h2>
      <p>
        Esta Politica de Privacidade podera ser atualizada para refletir mudancas
        operacionais, novas funcionalidades, ajustes de seguranca ou exigencias
        legais. A versao vigente ficara disponivel em
        https://salaopremiun.com.br/politica-de-privacidade.
      </p>

      <h2>16. Contato</h2>
      <p>
        Solicitacoes relacionadas a privacidade, dados pessoais, dados do Google
        ou seguranca podem ser encaminhadas pelos canais oficiais de suporte do
        SalaoPremium. Canal de suporte: +55 67 98434-1742.
      </p>
    </LegalPageLayout>
  );
}
