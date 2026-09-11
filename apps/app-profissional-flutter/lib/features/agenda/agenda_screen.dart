import 'package:flutter/material.dart';
import '../../core/api/professional_api.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/search_picker.dart';
import '../../data/api_models.dart';

class AgendaScreen extends StatefulWidget {
  const AgendaScreen({super.key});
  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  late DateTime _selectedDate;
  late DateTime _cursor;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
    _cursor = DateTime(now.year, now.month, 1);
  }

  bool _same(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
  String _monthTitle(DateTime d) {
    const m = [
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
    return '${m[d.month - 1]} ${d.year}';
  }

  String _dayTitle(DateTime d) {
    const w = [
      'segunda-feira',
      'terça-feira',
      'quarta-feira',
      'quinta-feira',
      'sexta-feira',
      'sábado',
      'domingo'
    ];
    return '${w[d.weekday - 1]}, ${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
  }

  List<DateTime?> _cells() {
    final first = DateTime(_cursor.year, _cursor.month, 1);
    final leading = first.weekday % 7;
    final result = <DateTime?>[for (var i = 0; i < leading; i++) null];
    final days = DateTime(_cursor.year, _cursor.month + 1, 0).day;
    for (var d = 1; d <= days; d++) {
      result.add(DateTime(_cursor.year, _cursor.month, d));
    }
    while (result.length % 7 != 0) {
      result.add(null);
    }
    return result;
  }

  Future<void> _guard(Future<void> Function() action, {String? success}) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      if (mounted && success != null) showAppSuccess(context, success);
    } on ApiException catch (e) {
      if (mounted) showAppError(context, e.message);
    } catch (e) {
      if (mounted) showAppError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _newAppointment() async {
    final c = AppScope.of(context);
    if (c.clients.isEmpty || c.services.isEmpty) {
      showAppError(
          context, 'Cadastre uma cliente e um serviço antes de agendar.');
      return;
    }
    String professionalId =
        c.profile?.canSeeAllAgenda == true ? '' : c.profile?.id ?? '';
    String clientId = '';
    String serviceId = '';
    final time = TextEditingController(text: '09:00');
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        builder: (sheetContext) =>
            StatefulBuilder(builder: (context, setModal) {
              final availableServices = c.services
                  .where((s) =>
                      professionalId.isEmpty ||
                      s.professionalId == professionalId)
                  .toList();
              return Padding(
                  padding: EdgeInsets.fromLTRB(
                      20, 14, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
                  child: SafeArea(
                      top: false,
                      child: SingleChildScrollView(
                          child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                            const _Handle(),
                            const Text('Novo agendamento',
                                style: TextStyle(
                                    fontSize: 23,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -.8)),
                            const SizedBox(height: 5),
                            Text(_dayTitle(_selectedDate),
                                style: const TextStyle(
                                    color: AppColors.muted,
                                    fontWeight: FontWeight.w700)),
                            const SizedBox(height: 18),
                            if (c.profile?.canSeeAllAgenda == true &&
                                c.professionals.length > 1) ...[
                              SearchPicker(
                                label: 'Profissional',
                                placeholder: 'Busque o profissional',
                                value: professionalId,
                                options: c.professionals
                                    .map((p) => SearchPickerOption(
                                          value: (p['id'] ?? '').toString(),
                                          label: (p['nome_exibicao'] ??
                                                  p['nome'] ??
                                                  'Profissional')
                                              .toString(),
                                          description: (p['categoria'] ??
                                                  p['cargo'] ??
                                                  '')
                                              .toString(),
                                        ))
                                    .toList(),
                                onChanged: (v) {
                                  setModal(() {
                                    professionalId = v;
                                    serviceId = '';
                                  });
                                },
                              ),
                              const SizedBox(height: 12),
                            ],
                            SearchPicker(
                              label: 'Cliente',
                              placeholder: 'Busque por nome ou WhatsApp',
                              value: clientId,
                              options: c.clients
                                  .map((client) => SearchPickerOption(
                                        value: client.id,
                                        label: client.name,
                                        description: client.bestPhone.isEmpty
                                            ? 'Sem WhatsApp'
                                            : client.bestPhone,
                                      ))
                                  .toList(),
                              onChanged: (v) {
                                setModal(() => clientId = v);
                              },
                            ),
                            const SizedBox(height: 12),
                            SearchPicker(
                              label: 'Serviço',
                              placeholder: 'Busque o serviço',
                              value: availableServices
                                      .any((s) => s.id == serviceId)
                                  ? serviceId
                                  : '',
                              options: availableServices
                                  .map((service) => SearchPickerOption(
                                        value: service.id,
                                        label: service.name,
                                        description:
                                            '${service.durationMinutes} min',
                                        meta: brMoney(service.price),
                                      ))
                                  .toList(),
                              onChanged: (v) {
                                setModal(() => serviceId = v);
                              },
                            ),
                            const SizedBox(height: 12),
                            TextField(
                                controller: time,
                                keyboardType: TextInputType.datetime,
                                decoration: const InputDecoration(
                                    labelText: 'Horário', hintText: '09:00')),
                            const SizedBox(height: 18),
                            FilledButton.icon(
                                onPressed: availableServices.isEmpty ||
                                        (c.profile?.canSeeAllAgenda == true &&
                                            professionalId.isEmpty) ||
                                        clientId.isEmpty ||
                                        serviceId.isEmpty
                                    ? null
                                    : () => Navigator.pop(sheetContext, true),
                                icon: const Icon(Icons.check_rounded),
                                label: const Text('Salvar agendamento'),
                                style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.ink,
                                    foregroundColor: Colors.white,
                                    minimumSize: const Size.fromHeight(52))),
                          ]))));
            }));
    if (saved == true && mounted) {
      await _guard(
          () => c.createAppointment(
              clientId: clientId,
              serviceId: serviceId,
              date: isoDay(_selectedDate),
              start: time.text.trim(),
              professionalId: professionalId),
          success: 'Agendamento criado.');
    }
    time.dispose();
  }

  Future<void> _blockTime() async {
    final c = AppScope.of(context);
    final reason = TextEditingController(text: 'Almoço');
    final start = TextEditingController(text: '12:00');
    final end = TextEditingController(text: '13:00');
    final selectedDates = <DateTime>{_selectedDate};
    var professionalId =
        c.profile?.canSeeAllAgenda == true ? '' : c.profile?.id ?? '';
    var allDay = false;
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        builder: (ctx) => StatefulBuilder(builder: (context, setModal) {
              final canChooseProfessional =
                  c.profile?.canSeeAllAgenda == true &&
                      c.professionals.length > 1;
              return Padding(
                  padding: EdgeInsets.fromLTRB(
                      20, 14, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
                  child: SafeArea(
                      top: false,
                      child: SingleChildScrollView(
                          child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                            const _Handle(),
                            const Text('Bloquear horário',
                                style: TextStyle(
                                    fontSize: 23,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -.8)),
                            const SizedBox(height: 6),
                            Text(
                                '${selectedDates.length} ${selectedDates.length == 1 ? 'dia selecionado' : 'dias selecionados'}',
                                style: const TextStyle(
                                    color: AppColors.muted,
                                    fontWeight: FontWeight.w700)),
                            const SizedBox(height: 16),
                            Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                    color: AppColors.goldSoft,
                                    border: Border.all(
                                        color: const Color(0xFFFDE68A)),
                                    borderRadius: BorderRadius.circular(18)),
                                child: Row(children: [
                                  Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius:
                                              BorderRadius.circular(14)),
                                      child: const Icon(Icons.block_rounded,
                                          color: AppColors.goldDark)),
                                  const SizedBox(width: 12),
                                  Expanded(
                                      child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                        const Text('BLOQUEIO DE AGENDA',
                                            style: TextStyle(
                                                color: AppColors.goldDark,
                                                fontSize: 10,
                                                fontWeight: FontWeight.w900,
                                                letterSpacing: 1.5)),
                                        const SizedBox(height: 3),
                                        Text(
                                            allDay
                                                ? 'Dia inteiro indisponível'
                                                : '${start.text} às ${end.text}',
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w900))
                                      ]))
                                ])),
                            const SizedBox(height: 12),
                            if (canChooseProfessional) ...[
                              SearchPicker(
                                  label: 'Profissional',
                                  placeholder: 'Busque o profissional',
                                  value: professionalId,
                                  options: c.professionals
                                      .map((p) => SearchPickerOption(
                                          value: (p['id'] ?? '').toString(),
                                          label: (p['nome_exibicao'] ??
                                                  p['nome'] ??
                                                  'Profissional')
                                              .toString(),
                                          description: 'Profissional'))
                                      .toList(),
                                  onChanged: (v) =>
                                      setModal(() => professionalId = v)),
                              const SizedBox(height: 12),
                            ],
                            TextField(
                                controller: reason,
                                decoration:
                                    const InputDecoration(labelText: 'Motivo')),
                            const SizedBox(height: 12),
                            InkWell(
                                borderRadius: BorderRadius.circular(17),
                                onTap: () {
                                  setModal(() {
                                    allDay = !allDay;
                                    if (allDay) {
                                      start.text = '08:00';
                                      end.text = '18:00';
                                    }
                                  });
                                },
                                child: Container(
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                        color: allDay
                                            ? AppColors.goldSoft
                                            : const Color(0xFFFAFAFA),
                                        border: Border.all(
                                            color: allDay
                                                ? AppColors.gold
                                                : AppColors.border),
                                        borderRadius:
                                            BorderRadius.circular(17)),
                                    child: Row(children: [
                                      Icon(Icons.calendar_today_rounded,
                                          color: allDay
                                              ? AppColors.goldDark
                                              : AppColors.muted),
                                      const SizedBox(width: 12),
                                      const Expanded(
                                          child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                            Text('Dia todo',
                                                style: TextStyle(
                                                    fontWeight:
                                                        FontWeight.w900)),
                                            Text(
                                                'Bloquear o expediente completo',
                                                style: TextStyle(
                                                    color: AppColors.muted,
                                                    fontSize: 12,
                                                    fontWeight:
                                                        FontWeight.w700))
                                          ])),
                                      Switch.adaptive(
                                          value: allDay,
                                          onChanged: (v) =>
                                              setModal(() => allDay = v))
                                    ]))),
                            if (!allDay) ...[
                              const SizedBox(height: 12),
                              Row(children: [
                                Expanded(
                                    child: TextField(
                                        controller: start,
                                        keyboardType: TextInputType.datetime,
                                        decoration: const InputDecoration(
                                            labelText: 'Início'))),
                                const SizedBox(width: 10),
                                Expanded(
                                    child: TextField(
                                        controller: end,
                                        keyboardType: TextInputType.datetime,
                                        decoration: const InputDecoration(
                                            labelText: 'Fim')))
                              ]),
                            ],
                            const SizedBox(height: 12),
                            Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                    color: Colors.white,
                                    border: Border.all(color: AppColors.border),
                                    borderRadius: BorderRadius.circular(18)),
                                child: GridView.builder(
                                    shrinkWrap: true,
                                    physics:
                                        const NeverScrollableScrollPhysics(),
                                    gridDelegate:
                                        const SliverGridDelegateWithFixedCrossAxisCount(
                                            crossAxisCount: 7,
                                            mainAxisSpacing: 6,
                                            crossAxisSpacing: 6),
                                    itemCount: _cells().length,
                                    itemBuilder: (context, index) {
                                      final day = _cells()[index];
                                      if (day == null) {
                                        return const SizedBox.shrink();
                                      }
                                      final selected = selectedDates
                                          .any((d) => _same(d, day));
                                      return InkWell(
                                          borderRadius:
                                              BorderRadius.circular(12),
                                          onTap: () => setModal(() {
                                                if (selected) {
                                                  selectedDates.removeWhere(
                                                      (d) => _same(d, day));
                                                } else {
                                                  selectedDates.add(day);
                                                }
                                              }),
                                          child: Container(
                                              alignment: Alignment.center,
                                              decoration: BoxDecoration(
                                                  color: selected
                                                      ? AppColors.ink
                                                      : Colors.white,
                                                  border: Border.all(
                                                      color: selected
                                                          ? AppColors.ink
                                                          : AppColors.border),
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                          12)),
                                              child: Text('${day.day}',
                                                  style: TextStyle(
                                                      color: selected
                                                          ? Colors.white
                                                          : AppColors.ink,
                                                      fontWeight:
                                                          FontWeight.w900))));
                                    })),
                            const SizedBox(height: 18),
                            FilledButton.icon(
                                onPressed: selectedDates.isEmpty ||
                                        (canChooseProfessional &&
                                            professionalId.isEmpty)
                                    ? null
                                    : () => Navigator.pop(ctx, true),
                                icon: const Icon(Icons.block_rounded),
                                label: const Text('Bloquear horário'))
                          ]))));
            }));
    if (saved == true && mounted) {
      await _guard(
          () => c.blockTime(
              dates: selectedDates.map(isoDay).toList(),
              start: start.text.trim(),
              end: end.text.trim(),
              reason: reason.text.trim(),
              professionalId: professionalId),
          success: 'Horário bloqueado.');
    }
    reason.dispose();
    start.dispose();
    end.dispose();
  }

  Future<void> _reschedule(AppAppointmentModel item) async {
    final start = TextEditingController(text: item.start);
    final end = TextEditingController(text: item.end);
    DateTime date = item.date;
    final ok = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        builder: (ctx) => StatefulBuilder(
            builder: (context, setModal) => Padding(
                padding: EdgeInsets.fromLTRB(
                    20, 14, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
                child: SafeArea(
                    top: false,
                    child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const _Handle(),
                          const Text('Reagendar',
                              style: TextStyle(
                                  fontSize: 23, fontWeight: FontWeight.w900)),
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                              onPressed: () async {
                                final d = await showDatePicker(
                                    context: context,
                                    firstDate: DateTime.now()
                                        .subtract(const Duration(days: 365)),
                                    lastDate: DateTime.now()
                                        .add(const Duration(days: 730)),
                                    initialDate: date);
                                if (d != null) setModal(() => date = d);
                              },
                              icon: const Icon(Icons.calendar_month_rounded),
                              label: Text(brDay(date))),
                          const SizedBox(height: 12),
                          Row(children: [
                            Expanded(
                                child: TextField(
                                    controller: start,
                                    decoration: const InputDecoration(
                                        labelText: 'Início'))),
                            const SizedBox(width: 10),
                            Expanded(
                                child: TextField(
                                    controller: end,
                                    decoration: const InputDecoration(
                                        labelText: 'Fim')))
                          ]),
                          const SizedBox(height: 18),
                          FilledButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              child: const Text('Salvar novo horário'))
                        ])))));
    if (ok == true && mounted) {
      final c = AppScope.of(context);
      await _guard(
          () => c.rescheduleAppointment(
              id: item.id,
              date: isoDay(date),
              start: start.text.trim(),
              end: end.text.trim()),
          success: 'Agendamento reagendado.');
    }
    start.dispose();
    end.dispose();
  }

  void _details(AppAppointmentModel item) {
    showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        builder: (ctx) => SafeArea(
            top: false,
            child: Padding(
                padding: EdgeInsets.fromLTRB(
                    20, 14, 20, MediaQuery.viewInsetsOf(ctx).bottom + 28),
                child: SingleChildScrollView(
                    child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                      const _Handle(),
                      Text(
                          item.isBlocked
                              ? 'Horário bloqueado'
                              : item.clientName,
                          style: const TextStyle(
                              fontSize: 24, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 14),
                      _Info('HORÁRIO', '${item.start} às ${item.end}'),
                      _Info('SERVIÇO', item.serviceName),
                      _Info('PROFISSIONAL', item.professionalName),
                      if (item.origin.isNotEmpty)
                        _Info('ORIGEM', item.origin.toUpperCase()),
                      if (item.createdByName.isNotEmpty)
                        _Info('AGENDADO POR', item.createdByName),
                      if (item.customerConfirmationStatus.isNotEmpty)
                        _Info('CONFIRMAÇÃO DO CLIENTE',
                            item.customerConfirmationStatus.toUpperCase()),
                      if (item.commandId.isNotEmpty)
                        _Info('COMANDA', '#${item.commandId}'),
                      if (item.signalStatus.isNotEmpty)
                        _Info(
                            'SINAL',
                            item.signalValue > 0
                                ? '${item.signalStatus.toUpperCase()} • ${brMoney(item.signalValue)}'
                                : item.signalStatus.toUpperCase()),
                      if (item.signalProofName.isNotEmpty)
                        _Info('COMPROVANTE', item.signalProofName),
                      if (item.notes.isNotEmpty)
                        _Info('OBSERVAÇÕES', item.notes),
                      const SizedBox(height: 8),
                      if (!item.isBlocked) ...[
                        if (item.status == 'pendente')
                          FilledButton.icon(
                              onPressed: _busy
                                  ? null
                                  : () async {
                                      Navigator.pop(ctx);
                                      await _guard(
                                          () => AppScope.of(context)
                                              .confirmAppointment(item.id),
                                          success: 'Agendamento confirmado.');
                                    },
                              icon: const Icon(Icons.check_rounded),
                              label: const Text('Confirmar atendimento')),
                        if (item.signalStatus == 'comprovante_enviado' &&
                            item.signalConfirmationOwner == 'profissional') ...[
                          const SizedBox(height: 8),
                          OutlinedButton.icon(
                              onPressed: _busy
                                  ? null
                                  : () async {
                                      Navigator.pop(ctx);
                                      await _guard(
                                          () => AppScope.of(context)
                                              .confirmPix(item.id),
                                          success: 'Pix confirmado.');
                                    },
                              icon: const Icon(Icons.pix_rounded),
                              label: const Text('Confirmar Pix'))
                        ],
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                            onPressed: _busy
                                ? null
                                : () {
                                    Navigator.pop(ctx);
                                    _reschedule(item);
                                  },
                            icon: const Icon(Icons.event_repeat_rounded),
                            label: const Text('Reagendar')),
                      ],
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                          onPressed: _busy
                              ? null
                              : () async {
                                  Navigator.pop(ctx);
                                  await _guard(
                                      () => AppScope.of(context)
                                          .cancelAppointment(item.id),
                                      success: item.isBlocked
                                          ? 'Bloqueio removido.'
                                          : 'Agendamento cancelado.');
                                },
                          icon: const Icon(Icons.delete_outline_rounded),
                          label: Text(item.isBlocked
                              ? 'Remover bloqueio'
                              : 'Cancelar agendamento'),
                          style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red))
                    ])))));
  }

  @override
  Widget build(BuildContext context) {
    final c = AppScope.of(context);
    final all = [...c.appointments, ...c.blocks];
    final selected = all.where((a) => _same(a.date, _selectedDate)).toList()
      ..sort((a, b) => a.start.compareTo(b.start));
    final cells = _cells();
    return RefreshIndicator(
        onRefresh: c.refreshData,
        child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 28),
            children: [
              Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: AppColors.border)),
                  child: Column(children: [
                    Row(children: [
                      _Circle(
                          Icons.chevron_left_rounded,
                          () => setState(() => _cursor =
                              DateTime(_cursor.year, _cursor.month - 1, 1))),
                      Expanded(
                          child: Text(_monthTitle(_cursor).toUpperCase(),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: .8))),
                      _Circle(
                          Icons.chevron_right_rounded,
                          () => setState(() => _cursor =
                              DateTime(_cursor.year, _cursor.month + 1, 1)))
                    ]),
                    const SizedBox(height: 12),
                    Row(children: [
                      for (final d in ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'])
                        Expanded(
                            child: Text(d,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900)))
                    ]),
                    const SizedBox(height: 7),
                    GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 7,
                                mainAxisSpacing: 5,
                                crossAxisSpacing: 5),
                        itemCount: cells.length,
                        itemBuilder: (context, index) {
                          final day = cells[index];
                          if (day == null) return const SizedBox.shrink();
                          final isSelected = _same(day, _selectedDate);
                          final dayItems = all.where((a) => _same(a.date, day));
                          return Material(
                              color: isSelected ? AppColors.ink : Colors.white,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(13),
                                  side: BorderSide(
                                      color: isSelected
                                          ? AppColors.ink
                                          : AppColors.border)),
                              child: InkWell(
                                  onTap: () =>
                                      setState(() => _selectedDate = day),
                                  borderRadius: BorderRadius.circular(13),
                                  child: Stack(
                                      alignment: Alignment.center,
                                      children: [
                                        Text('${day.day}',
                                            style: TextStyle(
                                                color: isSelected
                                                    ? Colors.white
                                                    : AppColors.ink,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w900)),
                                        if (dayItems.isNotEmpty)
                                          Positioned(
                                              bottom: 5,
                                              child: Row(
                                                  mainAxisSize:
                                                      MainAxisSize.min,
                                                  children: [
                                                    if (dayItems.any((e) =>
                                                        e.status == 'pendente'))
                                                      const _Dot(
                                                          Color(0xFFFACC15)),
                                                    if (dayItems.any((e) =>
                                                        e.status ==
                                                        'confirmado'))
                                                      const _Dot(
                                                          Color(0xFF10B981)),
                                                    if (dayItems.any(
                                                        (e) => e.isBlocked))
                                                      const _Dot(
                                                          Color(0xFF71717A))
                                                  ]))
                                      ])));
                        })
                  ])),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                    child: FilledButton.icon(
                        onPressed: _busy ? null : _newAppointment,
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('Novo agendamento'),
                        style: FilledButton.styleFrom(
                            backgroundColor: AppColors.ink,
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(50)))),
                const SizedBox(width: 9),
                SizedBox(
                    width: 52,
                    height: 50,
                    child: OutlinedButton(
                        onPressed: _busy ? null : _blockTime,
                        child: const Icon(Icons.block_rounded)))
              ]),
              const SizedBox(height: 17),
              Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(22)),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                const Text('Linha do tempo',
                                    style: TextStyle(
                                        fontSize: 21,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: -.7)),
                                Text(_dayTitle(_selectedDate),
                                    style: const TextStyle(
                                        color: AppColors.muted,
                                        fontWeight: FontWeight.w700))
                              ])),
                          Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                  color: const Color(0xFFF4F4F5),
                                  borderRadius: BorderRadius.circular(20)),
                              child: Text('${selected.length} itens',
                                  style: const TextStyle(
                                      color: AppColors.muted,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900)))
                        ]),
                        const SizedBox(height: 14),
                        if (selected.isEmpty)
                          Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                  color: const Color(0xFFFAFAFA),
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                      color: AppColors.border,
                                      style: BorderStyle.solid)),
                              child: const Text('Nenhum horário nesse dia.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                      color: AppColors.muted,
                                      fontWeight: FontWeight.w800)))
                        else
                          ...selected.map((item) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _AppointmentCard(
                                  item: item,
                                  onDetails: () => _details(item),
                                  onConfirm: item.status == 'pendente'
                                      ? () => _guard(
                                          () => c.confirmAppointment(item.id),
                                          success: 'Agendamento confirmado.')
                                      : null,
                                  onReschedule: item.isBlocked
                                      ? null
                                      : () => _reschedule(item),
                                  onCancel: () => _guard(
                                      () => c.cancelAppointment(item.id),
                                      success: item.isBlocked
                                          ? 'Bloqueio removido.'
                                          : 'Agendamento cancelado.'))))
                      ]))
            ]));
  }
}

class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({
    required this.item,
    required this.onDetails,
    this.onConfirm,
    this.onReschedule,
    this.onCancel,
  });
  final AppAppointmentModel item;
  final VoidCallback onDetails;
  final Future<void> Function()? onConfirm;
  final VoidCallback? onReschedule;
  final Future<void> Function()? onCancel;

  @override
  Widget build(BuildContext context) {
    final accent = switch (item.status) {
      'confirmado' => const Color(0xFF047857),
      'atendido' => const Color(0xFF1D4ED8),
      'bloqueado' => AppColors.ink,
      'cancelado' || 'faltou' => const Color(0xFFB91C1C),
      _ => const Color(0xFFA16207)
    };
    final bg = switch (item.status) {
      'confirmado' => const Color(0xFFECFDF5),
      'atendido' => const Color(0xFFEFF6FF),
      'bloqueado' => AppColors.ink,
      'cancelado' || 'faltou' => const Color(0xFFFEF2F2),
      _ => const Color(0xFFFEFCE8)
    };
    final textColor = item.isBlocked ? Colors.white : AppColors.ink;
    final mutedColor =
        item.isBlocked ? Colors.white.withValues(alpha: .72) : AppColors.muted;
    final statusBg = item.isBlocked ? Colors.white : bg;
    final statusFg = item.isBlocked ? AppColors.ink : accent;
    return Material(
        color: item.isBlocked ? AppColors.ink : Colors.white,
        borderRadius: BorderRadius.circular(19),
        child: InkWell(
            onTap: onDetails,
            borderRadius: BorderRadius.circular(19),
            child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(19),
                    border: Border.all(
                        color:
                            item.isBlocked ? AppColors.ink : AppColors.border)),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                                width: 64,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                    color: item.isBlocked
                                        ? Colors.white.withValues(alpha: .1)
                                        : bg,
                                    borderRadius: BorderRadius.circular(16)),
                                child: Column(children: [
                                  Icon(
                                      item.isBlocked
                                          ? Icons.block_rounded
                                          : Icons.schedule_rounded,
                                      color: item.isBlocked
                                          ? Colors.white
                                          : accent,
                                      size: 18),
                                  const SizedBox(height: 4),
                                  Text(item.start,
                                      style: TextStyle(
                                          color: item.isBlocked
                                              ? Colors.white
                                              : accent,
                                          fontWeight: FontWeight.w900)),
                                  Text(item.end,
                                      style: TextStyle(
                                          color: item.isBlocked
                                              ? Colors.white
                                                  .withValues(alpha: .72)
                                              : accent.withValues(alpha: .72),
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700))
                                ])),
                            const SizedBox(width: 12),
                            Expanded(
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                  Row(children: [
                                    Expanded(
                                        child: Text(
                                            item.isBlocked
                                                ? 'Horário bloqueado'
                                                : item.clientName,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                                color: textColor,
                                                fontSize: 16,
                                                fontWeight: FontWeight.w900))),
                                    if (!item.isBlocked)
                                      Text(brMoney(item.price),
                                          style: const TextStyle(
                                              color: AppColors.goldDark,
                                              fontSize: 13,
                                              fontWeight: FontWeight.w900))
                                  ]),
                                  const SizedBox(height: 4),
                                  Text(item.serviceName,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                          color: mutedColor,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700)),
                                  if (item.professionalName.isNotEmpty) ...[
                                    const SizedBox(height: 3),
                                    Text(item.professionalName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                            color: mutedColor,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700)),
                                  ],
                                  const SizedBox(height: 9),
                                  Wrap(spacing: 7, runSpacing: 7, children: [
                                    _Pill(
                                        label: item.status
                                            .replaceAll('_', ' ')
                                            .toUpperCase(),
                                        bg: statusBg,
                                        fg: statusFg),
                                    if (item.origin.isNotEmpty)
                                      _Pill(
                                          label: item.origin.toUpperCase(),
                                          bg: item.isBlocked
                                              ? Colors.white
                                                  .withValues(alpha: .14)
                                              : const Color(0xFFF4F4F5),
                                          fg: item.isBlocked
                                              ? Colors.white
                                              : AppColors.muted),
                                    if (item.signalStatus ==
                                        'comprovante_enviado')
                                      const _Pill(
                                          label: 'PIX ENVIADO',
                                          bg: Color(0xFFFFFBEB),
                                          fg: AppColors.goldDark),
                                  ])
                                ]))
                          ]),
                      const SizedBox(height: 12),
                      Wrap(spacing: 8, runSpacing: 8, children: [
                        _MiniAction(
                            icon: Icons.visibility_outlined,
                            label: 'Detalhes',
                            onTap: onDetails,
                            inverted: item.isBlocked),
                        if (onConfirm != null)
                          _MiniAction(
                              icon: Icons.check_rounded,
                              label: 'Confirmar',
                              onTap: () {
                                onConfirm!();
                              },
                              inverted: item.isBlocked),
                        if (onReschedule != null)
                          _MiniAction(
                              icon: Icons.event_repeat_rounded,
                              label: 'Reagendar',
                              onTap: onReschedule!,
                              inverted: item.isBlocked),
                        if (onCancel != null)
                          _MiniAction(
                              icon: item.isBlocked
                                  ? Icons.lock_open_rounded
                                  : Icons.close_rounded,
                              label: item.isBlocked ? 'Remover' : 'Cancelar',
                              onTap: () {
                                onCancel!();
                              },
                              danger: !item.isBlocked,
                              inverted: item.isBlocked),
                      ])
                    ]))));
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.bg, required this.fg});
  final String label;
  final Color bg;
  final Color fg;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label,
          style:
              TextStyle(color: fg, fontSize: 9, fontWeight: FontWeight.w900)));
}

class _MiniAction extends StatelessWidget {
  const _MiniAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
    this.inverted = false,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;
  final bool inverted;
  @override
  Widget build(BuildContext context) {
    final fg = danger
        ? const Color(0xFFB91C1C)
        : inverted
            ? Colors.white
            : AppColors.ink;
    return Material(
        color: inverted ? Colors.white.withValues(alpha: .1) : Colors.white,
        borderRadius: BorderRadius.circular(13),
        child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(13),
            child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(13),
                    border: Border.all(
                        color: inverted
                            ? Colors.white.withValues(alpha: .2)
                            : AppColors.border)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(icon, color: fg, size: 16),
                  const SizedBox(width: 6),
                  Text(label,
                      style: TextStyle(
                          color: fg, fontSize: 11, fontWeight: FontWeight.w900))
                ]))));
  }
}

class _Circle extends StatelessWidget {
  const _Circle(this.icon, this.onTap);
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
      color: Colors.white,
      shape: const CircleBorder(side: BorderSide(color: AppColors.border)),
      child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: SizedBox(width: 42, height: 42, child: Icon(icon))));
}

class _Dot extends StatelessWidget {
  const _Dot(this.color);
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
      width: 5,
      height: 5,
      margin: const EdgeInsets.symmetric(horizontal: 1),
      decoration: BoxDecoration(color: color, shape: BoxShape.circle));
}

class _Handle extends StatelessWidget {
  const _Handle();
  @override
  Widget build(BuildContext context) => const Center(
      child: Padding(
          padding: EdgeInsets.only(bottom: 14),
          child: SizedBox(
              width: 42,
              child: Divider(thickness: 4, color: Color(0xFFE4E4E7)))));
}

class _Info extends StatelessWidget {
  const _Info(this.label, this.value);
  final String label, value;
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
