import 'package:flutter/material.dart';
import '../../core/navigation/app_section.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.onNavigate});
  final ValueChanged<AppSection> onNavigate;

  void _showAppointmentDetails(BuildContext context, dynamic item) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Center(
                  child: Padding(
                      padding: EdgeInsets.only(bottom: 14),
                      child: SizedBox(
                          width: 42,
                          child: Divider(
                              thickness: 4, color: Color(0xFFE4E4E7))))),
              const Text('Próximo atendimento',
                  style: TextStyle(
                      fontSize: 23,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -.8)),
              const SizedBox(height: 14),
              _InfoTile('CLIENTE', item.clientName),
              _InfoTile('SERVIÇO', item.serviceName),
              _InfoTile('HORÁRIO', '${item.start} às ${item.end}'),
              if ((item.professionalName as String).isNotEmpty)
                _InfoTile('PROFISSIONAL', item.professionalName),
              if ((item.origin as String).isNotEmpty)
                _InfoTile('ORIGEM', (item.origin as String).toUpperCase()),
              if ((item.notes as String).isNotEmpty)
                _InfoTile('OBSERVAÇÕES', item.notes),
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  onNavigate(AppSection.agenda);
                },
                icon: const Icon(Icons.calendar_month_rounded),
                label: const Text('Abrir na agenda'),
              )
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final now = DateTime.now();
    final today = controller.appointments
        .where((a) =>
            a.date.year == now.year &&
            a.date.month == now.month &&
            a.date.day == now.day &&
            !['cancelado', 'faltou'].contains(a.status.toLowerCase()))
        .toList()
      ..sort((a, b) => a.start.compareTo(b.start));
    final openCommands =
        controller.commands.where((c) => c.status == 'aberta').toList();
    final completed =
        today.where((a) => a.status.toLowerCase() == 'atendido').length;
    final expected = today.fold<double>(0, (sum, a) => sum + a.price);
    final next = today
        .where((a) =>
            !['atendido', 'faltou', 'bloqueado']
                .contains(a.status.toLowerCase()) &&
            a.start.compareTo(
                    '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}') >=
                0)
        .firstOrNull;

    return RefreshIndicator(
      onRefresh: controller.refreshAll,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(
                      '${_greeting(now.hour)}, ${_firstName(controller.profile?.name)}!',
                      style: const TextStyle(
                          fontSize: 30,
                          height: 1.02,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -1.6)),
                  const SizedBox(height: 8),
                  const Text('Veja como está seu dia.',
                      style: TextStyle(
                          color: AppColors.muted,
                          fontSize: 16,
                          fontWeight: FontWeight.w700))
                ])),
            const SizedBox(width: 12),
            Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(
                          color: Color(0x090F172A),
                          blurRadius: 14,
                          offset: Offset(0, 4))
                    ]),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(_weekday(now),
                          style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 11,
                              fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(_dayMonth(now),
                          style: const TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w900))
                    ]))
          ]),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(22)),
            child: next == null
                ? Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                        color: const Color(0xFFFAFAFA),
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(16)),
                    child: const Text('Nenhum próximo atendimento para hoje.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: AppColors.muted)))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                        const Row(children: [
                          Icon(Icons.schedule_rounded,
                              color: AppColors.goldDark, size: 17),
                          SizedBox(width: 8),
                          Text('PRÓXIMO ATENDIMENTO',
                              style: TextStyle(
                                  color: AppColors.goldDark,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.6))
                        ]),
                        const SizedBox(height: 10),
                        Row(children: [
                          Container(
                              width: 60,
                              height: 60,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                  color: AppColors.goldSoft,
                                  borderRadius: BorderRadius.circular(17)),
                              child: Text(next.start,
                                  style: const TextStyle(
                                      color: AppColors.goldDark,
                                      fontSize: 30,
                                      letterSpacing: -1.4,
                                      fontWeight: FontWeight.w900))),
                          const SizedBox(width: 12),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Text(next.clientName,
                                    style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w900)),
                                const SizedBox(height: 3),
                                Text(
                                    '${next.serviceName}${_duration(next).isEmpty ? '' : ' • ${_duration(next)}'}',
                                    style: const TextStyle(
                                        color: AppColors.muted,
                                        fontWeight: FontWeight.w700))
                              ])),
                        ]),
                        const SizedBox(height: 14),
                        SizedBox(
                            width: double.infinity,
                            child: Row(children: [
                              Expanded(
                                  child: OutlinedButton.icon(
                                      onPressed: () => _showAppointmentDetails(
                                          context, next),
                                      icon:
                                          const Icon(Icons.visibility_outlined),
                                      label: const Text('Ver detalhes'))),
                              const SizedBox(width: 10),
                              Expanded(
                                  child: FilledButton.icon(
                                      onPressed: () =>
                                          onNavigate(AppSection.agenda),
                                      icon: const Icon(
                                          Icons.chevron_right_rounded),
                                      label: const Text('Abrir agenda')))
                            ])),
                      ]),
          ),
          const SizedBox(height: 14),
          Container(
              decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(18)),
              child: Row(children: [
                Expanded(
                    child: _Metric(
                        label: 'Hoje',
                        value: '${today.length}',
                        icon: Icons.calendar_month_rounded,
                        tint: AppColors.goldDark)),
                Expanded(
                    child: _Metric(
                        label: 'Concluídos',
                        value: '$completed',
                        icon: Icons.check_circle_rounded,
                        tint: AppColors.ink)),
                Expanded(
                    child: _Metric(
                        label: 'Previsto',
                        value: brMoney(expected),
                        icon: Icons.payments_rounded,
                        tint: AppColors.goldDark,
                        small: true)),
              ])),
          const SizedBox(height: 14),
          GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.95,
              children: [
                _Quick(
                    icon: Icons.calendar_month_rounded,
                    label: 'Agenda',
                    text: 'Ver horários',
                    onTap: () => onNavigate(AppSection.agenda)),
                _Quick(
                    icon: Icons.people_alt_rounded,
                    label: 'Clientes',
                    text: '${controller.clients.length} cadastros',
                    onTap: () => onNavigate(AppSection.clientes)),
                _Quick(
                    icon: Icons.content_cut_rounded,
                    label: 'Serviços',
                    text: '${controller.services.length} ativos',
                    onTap: () => onNavigate(AppSection.servicos)),
                _Quick(
                    icon: Icons.account_balance_wallet_rounded,
                    label: 'Comandas',
                    text: '${openCommands.length} abertas',
                    onTap: () => onNavigate(AppSection.comandas)),
              ]),
        ],
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

class _Metric extends StatelessWidget {
  const _Metric(
      {required this.label,
      required this.value,
      required this.icon,
      required this.tint,
      this.small = false});
  final String label;
  final String value;
  final IconData icon;
  final Color tint;
  final bool small;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                  color: tint == AppColors.ink
                      ? const Color(0xFFF4F4F5)
                      : AppColors.goldSoft,
                  borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: tint, size: 19)),
          const SizedBox(width: 9),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: small ? 13 : 17,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -.4)),
                Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 10,
                        fontWeight: FontWeight.w800))
              ]))
        ])
      ]));
}

class _Quick extends StatelessWidget {
  const _Quick(
      {required this.icon,
      required this.label,
      required this.text,
      required this.onTap});
  final IconData icon;
  final String label;
  final String text;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(18)),
              child: Row(children: [
                Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                        color: AppColors.goldSoft,
                        borderRadius: BorderRadius.circular(15)),
                    child: Icon(icon, color: AppColors.goldDark, size: 21)),
                const SizedBox(width: 12),
                Expanded(
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w900)),
                      Text(text,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w700))
                    ])),
                const Icon(Icons.chevron_right_rounded, color: AppColors.muted)
              ]))));
}

class _InfoTile extends StatelessWidget {
  const _InfoTile(this.label, this.value);
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Container(
      margin: const EdgeInsets.only(bottom: 9),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: const Color(0xFFFAFAFA),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF0F0F2))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(
                color: Color(0xFFA1A1AA),
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.4)),
        const SizedBox(height: 4),
        Text(value,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900))
      ]));
}

String _firstName(String? value) =>
    (value ?? '').trim().split(RegExp(r'\s+')).firstOrNull ?? 'Profissional';

String _greeting(int hour) {
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

String _weekday(DateTime date) {
  const values = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];
  return values[date.weekday - 1];
}

String _dayMonth(DateTime date) {
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
  ];
  return '${date.day.toString().padLeft(2, '0')} de ${months[date.month - 1]}';
}

String _duration(dynamic item) {
  final partsStart =
      item.start.split(':').map((e) => int.tryParse(e) ?? 0).toList();
  final partsEnd =
      item.end.split(':').map((e) => int.tryParse(e) ?? 0).toList();
  if (partsStart.length < 2 || partsEnd.length < 2) return '';
  final minutes =
      (partsEnd[0] * 60 + partsEnd[1]) - (partsStart[0] * 60 + partsStart[1]);
  if (minutes <= 0) return '';
  if (minutes % 60 == 0) return '${minutes ~/ 60}h';
  if (minutes > 60) return '${minutes ~/ 60}h ${minutes % 60}min';
  return '${minutes}min';
}
