import 'package:flutter/material.dart';
import '../../core/api/professional_api.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  int _interval = 30;
  bool _initialized = false;
  bool _busy = false;
  late List<_WorkDay> _days;

  static const _names = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];

  void _init(BuildContext context) {
    if (_initialized) return;
    final profile = AppScope.of(context).profile;
    _name.text = profile?.name ?? '';
    _phone.text = profile?.phone.isNotEmpty == true
        ? profile!.phone
        : (profile?.whatsapp ?? '');
    _interval = profile?.intervalMinutes ?? 30;

    _days = List.generate(7, (index) {
      Map<String, dynamic>? found;
      for (final raw in profile?.workDays ?? <Map<String, dynamic>>[]) {
        final day = (raw['dia'] ?? '').toString().trim().toLowerCase();
        if (day == _names[index].toLowerCase() || day == index.toString()) {
          found = raw;
          break;
        }
      }

      final active =
          found == null ? index >= 1 && index <= 6 : found['ativo'] != false;
      final start =
          (found == null ? '09:00' : (found['inicio'] ?? '09:00')).toString();
      final end =
          (found == null ? '18:00' : (found['fim'] ?? '18:00')).toString();
      return _WorkDay(_names[index], active: active, start: start, end: end);
    });
    _initialized = true;
  }

  Future<String?> _pick(String value) async {
    final parts = value.split(':');
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(
        hour: int.tryParse(parts.first) ?? 9,
        minute: parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0,
      ),
    );
    if (time == null) return null;
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      showAppError(context, 'Informe seu nome.');
      return;
    }
    setState(() => _busy = true);
    try {
      await AppScope.of(context).saveSettings(
        name: _name.text.trim(),
        phone: _phone.text.trim(),
        interval: _interval,
        workDays: _days
            .map((day) => {
                  'dia': day.name,
                  'ativo': day.active,
                  'inicio': day.start,
                  'fim': day.end,
                })
            .toList(),
      );
      if (mounted) showAppSuccess(context, 'Configurações salvas com sucesso.');
    } on ApiException catch (e) {
      if (mounted) showAppError(context, e.message);
    } catch (e) {
      if (mounted) showAppError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _init(context);
    return ListView(
      padding: const EdgeInsets.only(bottom: 30),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Seu perfil',
                  style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
              const SizedBox(height: 12),
              TextField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Nome')),
              const SizedBox(height: 10),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration:
                    const InputDecoration(labelText: 'Telefone / WhatsApp'),
              ),
              const SizedBox(height: 10),
              const Text('INTERVALO DA AGENDA',
                  style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.3)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final option in const [15, 30, 60, 120])
                    ChoiceChip(
                      selected: _interval == option,
                      onSelected: (_) => setState(() => _interval = option),
                      label: Text(_intervalLabel(option)),
                      selectedColor: AppColors.ink,
                      labelStyle: TextStyle(
                        color:
                            _interval == option ? Colors.white : AppColors.ink,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Horário de funcionamento',
                  style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              const Text('Defina seus dias e expediente.',
                  style: TextStyle(
                      color: AppColors.muted, fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              ..._days.map(
                (day) => Container(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: const BoxDecoration(
                    border:
                        Border(bottom: BorderSide(color: Color(0xFFF4F4F5))),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(day.name,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w900)),
                                Text(
                                  day.active
                                      ? '${day.start} às ${day.end}'
                                      : 'Não atende',
                                  style: const TextStyle(
                                      color: AppColors.muted,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                          Switch.adaptive(
                            value: day.active,
                            onChanged: (value) =>
                                setState(() => day.active = value),
                          ),
                        ],
                      ),
                      if (day.active) ...[
                        const SizedBox(height: 7),
                        Row(
                          children: [
                            Expanded(
                              child: _TimeButton('Início', day.start, () async {
                                final value = await _pick(day.start);
                                if (value != null) {
                                  setState(() => day.start = value);
                                }
                              }),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _TimeButton('Fim', day.end, () async {
                                final value = await _pick(day.end);
                                if (value != null) {
                                  setState(() => day.end = value);
                                }
                              }),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _busy ? null : _save,
            icon: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.save_rounded),
            label: const Text('Salvar configurações'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.ink,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
            ),
          ),
        ),
      ],
    );
  }
}

String _intervalLabel(int value) {
  if (value < 60) return '$value min';
  final hours = value ~/ 60;
  return '${hours}h';
}

class _WorkDay {
  _WorkDay(this.name,
      {required this.active, required this.start, required this.end});
  final String name;
  bool active;
  String start;
  String end;
}

class _TimeButton extends StatelessWidget {
  const _TimeButton(this.label, this.value, this.onTap);
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        child: Column(
          children: [
            Text(label,
                style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 9,
                    fontWeight: FontWeight.w900)),
            Text(value,
                style: const TextStyle(
                    color: AppColors.ink, fontWeight: FontWeight.w900)),
          ],
        ),
      );
}
