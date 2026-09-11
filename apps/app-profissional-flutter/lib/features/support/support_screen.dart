import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  static const _faq = [
    (
      'Como bloquear horário?',
      'Abra Agenda, selecione o dia e use a opção Bloquear horário. O bloqueio aparece junto aos horários do dia.'
    ),
    (
      'Como confirmar atendimento?',
      'Na Agenda, abra o atendimento pendente e toque em Confirmar. O status é atualizado no servidor.'
    ),
    (
      'Como abrir uma comanda?',
      'Entre em Comandas, toque em Nova comanda, escolha a cliente e adicione os serviços realizados.'
    ),
    (
      'Como ajustar meus horários?',
      'Abra Configurações e altere os dias, horários de início/fim e o intervalo da agenda.'
    ),
  ];

  void _showSupportInfo(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) => const SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, 26),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.support_agent_rounded,
                  color: AppColors.goldDark, size: 32),
              SizedBox(height: 12),
              Text(
                'Canal de suporte',
                style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -1),
              ),
              SizedBox(height: 8),
              Text(
                'As dúvidas rápidas estão disponíveis abaixo. O envio de conversa/ticket não é simulado pelo aplicativo.',
                style: TextStyle(
                    color: AppColors.muted,
                    height: 1.5,
                    fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 30),
      children: [
        Container(
          padding: const EdgeInsets.all(19),
          decoration: BoxDecoration(
              color: AppColors.ink, borderRadius: BorderRadius.circular(24)),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.support_agent_rounded,
                  color: AppColors.gold, size: 31),
              SizedBox(height: 17),
              Text(
                'Suporte',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -1.4,
                ),
              ),
              SizedBox(height: 5),
              Text(
                'Encontre respostas rápidas para usar o App Profissional.',
                style: TextStyle(
                  color: Color(0xFFD4D4D8),
                  fontSize: 12,
                  height: 1.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => _showSupportInfo(context),
          icon: const Icon(Icons.chat_bubble_outline_rounded),
          label: const Text('Chamar suporte'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.gold,
            foregroundColor: AppColors.ink,
            minimumSize: const Size.fromHeight(52),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(17)),
            textStyle: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Dúvidas frequentes',
                style: TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -.7),
              ),
              const SizedBox(height: 10),
              ..._faq.map(
                (item) => ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  childrenPadding: const EdgeInsets.only(bottom: 13),
                  shape: const Border(),
                  collapsedShape: const Border(),
                  title: Text(item.$1,
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w900)),
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        item.$2,
                        style: const TextStyle(
                          color: AppColors.muted,
                          height: 1.5,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
