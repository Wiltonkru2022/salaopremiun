import 'package:flutter/material.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';

class CommissionScreen extends StatefulWidget {
  const CommissionScreen({super.key});
  @override
  State<CommissionScreen> createState() => _CommissionScreenState();
}

class _CommissionScreenState extends State<CommissionScreen> {
  String _status = 'todos';
  bool _allMonths = true;
  int _month = DateTime.now().month;
  int _year = DateTime.now().year;
  @override
  Widget build(BuildContext context) {
    final c = AppScope.of(context);
    final items = c.commissions.where((x) {
      final status = _status == 'todos' || x.status.toLowerCase() == _status;
      final month = _allMonths ||
          x.competenceDate == null ||
          (x.competenceDate!.month == _month &&
              x.competenceDate!.year == _year);
      return status && month;
    }).toList();
    final paid = items
        .where((x) => x.status.toLowerCase() == 'pago')
        .fold<double>(0, (s, x) => s + x.value);
    final pending = items
        .where((x) => x.status.toLowerCase() != 'pago')
        .fold<double>(0, (s, x) => s + x.value);
    return RefreshIndicator(
        onRefresh: c.refreshCommissions,
        child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 28),
            children: [
              Row(children: [
                Expanded(child: _Metric('PAGO', brMoney(paid), AppColors.ink)),
                const SizedBox(width: 9),
                Expanded(
                    child: _Metric(
                        'PENDENTE', brMoney(pending), AppColors.goldDark))
              ]),
              const SizedBox(height: 12),
              Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(22)),
                  child: Column(children: [
                    Row(children: [
                      Expanded(
                          child: OutlinedButton.icon(
                              onPressed: () {
                                setState(() => _allMonths = !_allMonths);
                              },
                              icon: const Icon(Icons.calendar_month_rounded),
                              label: Text(_allMonths
                                  ? 'Todos os meses'
                                  : '${_month.toString().padLeft(2, '0')}/$_year'))),
                      const SizedBox(width: 8),
                      Expanded(
                          child: _Segment(
                              value: _status,
                              labels: const {
                                'todos': 'Todos',
                                'pendente': 'Pendente',
                                'pago': 'Pago'
                              },
                              onChanged: (v) => setState(() => _status = v)))
                    ]),
                    if (!_allMonths) ...[
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(
                            child: _StepperField(
                                label: 'Mês',
                                value: _month,
                                min: 1,
                                max: 12,
                                onChanged: (v) => setState(() => _month = v))),
                        const SizedBox(width: 8),
                        Expanded(
                            child: _StepperField(
                                label: 'Ano',
                                value: _year,
                                min: DateTime.now().year - 4,
                                max: DateTime.now().year,
                                onChanged: (v) => setState(() => _year = v))),
                      ])
                    ]
                  ])),
              const SizedBox(height: 12),
              if (items.isEmpty)
                _empty()
              else
                ...items.map((x) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(15),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(18)),
                    child: Row(children: [
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(x.description,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w900)),
                            const SizedBox(height: 4),
                            Text(
                                '${x.percent.toStringAsFixed(0)}% sobre ${brMoney(x.baseValue)} • ${brDay(x.competenceDate)}',
                                style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700))
                          ])),
                      Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(brMoney(x.value),
                                style: const TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.w900)),
                            const SizedBox(height: 4),
                            Text(x.status.toUpperCase(),
                                style: TextStyle(
                                    color: x.status.toLowerCase() == 'pago'
                                        ? AppColors.ink
                                        : AppColors.goldDark,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900))
                          ])
                    ])))
            ]));
  }
}

class _Segment extends StatelessWidget {
  const _Segment({
    required this.value,
    required this.labels,
    required this.onChanged,
  });
  final String value;
  final Map<String, String> labels;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: const Color(0xFFF4F4F5),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: labels.entries
              .map(
                (entry) => Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => onChanged(entry.key),
                    child: Container(
                      height: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: entry.key == value
                            ? AppColors.ink
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        entry.value,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: entry.key == value
                              ? Colors.white
                              : AppColors.muted,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                ),
              )
              .toList(),
        ),
      );
}

class _StepperField extends StatelessWidget {
  const _StepperField({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });
  final String label;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 10,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Row(
              children: [
                _MiniIcon(
                    icon: Icons.remove_rounded,
                    onTap: value <= min ? null : () => onChanged(value - 1)),
                Expanded(
                    child: Text('$value',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w900))),
                _MiniIcon(
                    icon: Icons.add_rounded,
                    onTap: value >= max ? null : () => onChanged(value + 1)),
              ],
            ),
          ],
        ),
      );
}

class _MiniIcon extends StatelessWidget {
  const _MiniIcon({required this.icon, this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => IconButton(
        onPressed: onTap,
        visualDensity: VisualDensity.compact,
        icon: Icon(icon, size: 18),
      );
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value, this.color);
  final String label, value;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(18)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(
                color: AppColors.muted,
                fontSize: 9,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 5),
        Text(value,
            style: TextStyle(
                color: color, fontSize: 20, fontWeight: FontWeight.w900))
      ]));
}

Widget _empty() => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(18)),
    child: const Text('Nenhum lançamento encontrado.',
        textAlign: TextAlign.center,
        style: TextStyle(color: AppColors.muted, fontWeight: FontWeight.w800)));
