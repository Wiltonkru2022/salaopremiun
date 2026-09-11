import 'package:flutter/material.dart';

enum AppSection {
  inicio,
  agenda,
  clientes,
  servicos,
  comandas,
  cupons,
  comissao,
  avaliacoes,
  notificacoes,
  perfil,
  configuracoes,
  suporte,
}

extension AppSectionX on AppSection {
  String get label => switch (this) {
        AppSection.inicio => 'Início',
        AppSection.agenda => 'Agenda',
        AppSection.clientes => 'Clientes',
        AppSection.servicos => 'Serviços',
        AppSection.comandas => 'Comandas',
        AppSection.cupons => 'Cupons',
        AppSection.comissao => 'Comissão',
        AppSection.avaliacoes => 'Avaliações',
        AppSection.notificacoes => 'Notificações',
        AppSection.perfil => 'Perfil',
        AppSection.configuracoes => 'Configurações',
        AppSection.suporte => 'Suporte',
      };

  String get subtitle => switch (this) {
        AppSection.inicio => 'Visão geral do seu dia',
        AppSection.agenda => 'Horários e atendimentos',
        AppSection.clientes => 'Cadastro e histórico',
        AppSection.servicos => 'Serviços oferecidos',
        AppSection.comandas => 'Atendimentos e pagamentos',
        AppSection.cupons => 'Cupons e benefícios',
        AppSection.comissao => 'Acompanhe seus ganhos',
        AppSection.avaliacoes => 'Feedback das clientes',
        AppSection.notificacoes => 'Avisos do seu salão',
        AppSection.perfil => 'Seus dados profissionais',
        AppSection.configuracoes => 'Preferências do aplicativo',
        AppSection.suporte => 'Ajuda e atendimento',
      };

  IconData get icon => switch (this) {
        AppSection.inicio => Icons.home_rounded,
        AppSection.agenda => Icons.calendar_month_rounded,
        AppSection.clientes => Icons.people_alt_rounded,
        AppSection.servicos => Icons.content_cut_rounded,
        AppSection.comandas => Icons.account_balance_wallet_rounded,
        AppSection.cupons => Icons.local_activity_rounded,
        AppSection.comissao => Icons.payments_rounded,
        AppSection.avaliacoes => Icons.star_rounded,
        AppSection.notificacoes => Icons.notifications_rounded,
        AppSection.perfil => Icons.person_rounded,
        AppSection.configuracoes => Icons.settings_rounded,
        AppSection.suporte => Icons.help_rounded,
      };
}
