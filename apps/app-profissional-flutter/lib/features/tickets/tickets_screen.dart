import 'package:flutter/material.dart';
import '../../core/api/professional_api.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/search_picker.dart';
import '../../data/api_models.dart';

class TicketsScreen extends StatefulWidget {
  const TicketsScreen({super.key});
  @override
  State<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends State<TicketsScreen> {
  final _search = TextEditingController();
  String? _selectedId;
  bool _busy = false;
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _guard(Future<void> Function() fn, String ok) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await fn();
      if (mounted) showAppSuccess(context, ok);
    } on ApiException catch (e) {
      if (mounted) showAppError(context, e.message);
    } catch (e) {
      if (mounted) showAppError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _newCommand() async {
    final c = AppScope.of(context);
    String clientId = '';
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
                          const Center(
                              child: SizedBox(
                                  width: 42, child: Divider(thickness: 4))),
                          const Text('Nova comanda',
                              style: TextStyle(
                                  fontSize: 23, fontWeight: FontWeight.w900)),
                          const SizedBox(height: 6),
                          const Text(
                              'Selecione a cliente ou abra para consumidor final.',
                              style: TextStyle(
                                  color: AppColors.muted,
                                  fontWeight: FontWeight.w700)),
                          const SizedBox(height: 16),
                          SearchPicker(
                            label: 'Cliente',
                            placeholder: 'Busque por nome ou WhatsApp',
                            value: clientId,
                            hideInputWhenSelected: false,
                            options: [
                              const SearchPickerOption(
                                value: '',
                                label: 'Consumidor Final',
                                description: 'Sem cliente cadastrado',
                              ),
                              ...c.clients.map((client) => SearchPickerOption(
                                    value: client.id,
                                    label: client.name,
                                    description: client.bestPhone.isEmpty
                                        ? 'Sem WhatsApp'
                                        : client.bestPhone,
                                  )),
                            ],
                            onChanged: (v) => setModal(() => clientId = v),
                          ),
                          const SizedBox(height: 18),
                          FilledButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              child: const Text('Abrir atendimento'))
                        ])))));
    if (ok == true && mounted) {
      final client = c.clients.where((x) => x.id == clientId).firstOrNull;
      await _guard(
          () => c.openCommand(
              clientId: client?.id,
              clientName: client?.name ?? 'Consumidor Final'),
          'Comanda aberta.');
    }
  }

  Future<void> _addService(AppCommandModel command) async {
    final c = AppScope.of(context);
    if (c.services.isEmpty) {
      showAppError(context, 'Nenhum serviço disponível.');
      return;
    }
    String serviceId = c.services.first.id;
    int qty = 1;
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
                          const Center(
                              child: SizedBox(
                                  width: 42, child: Divider(thickness: 4))),
                          const Text('Adicionar serviço',
                              style: TextStyle(
                                  fontSize: 23, fontWeight: FontWeight.w900)),
                          const SizedBox(height: 16),
                          SearchPicker(
                            label: 'Serviço',
                            placeholder: 'Busque o serviço',
                            value: serviceId,
                            options: c.services
                                .map((service) => SearchPickerOption(
                                      value: service.id,
                                      label: service.name,
                                      description:
                                          '${service.durationMinutes} min',
                                      meta: brMoney(service.price),
                                    ))
                                .toList(),
                            onChanged: (v) => setModal(() => serviceId = v),
                          ),
                          const SizedBox(height: 12),
                          Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                  color: const Color(0xFFF4F4F5),
                                  borderRadius: BorderRadius.circular(18)),
                              child: Row(children: [
                                const Text('Quantidade',
                                    style: TextStyle(
                                        color: AppColors.muted,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w900)),
                                const Spacer(),
                                IconButton(
                                    onPressed: qty <= 1
                                        ? null
                                        : () => setModal(() => qty--),
                                    icon: const Icon(Icons.remove_rounded)),
                                Text('$qty',
                                    style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w900)),
                                IconButton(
                                    onPressed: () => setModal(() => qty++),
                                    icon: const Icon(Icons.add_rounded))
                              ])),
                          const SizedBox(height: 18),
                          FilledButton(
                              onPressed: serviceId.isEmpty
                                  ? null
                                  : () => Navigator.pop(ctx, true),
                              child: const Text('Adicionar'))
                        ])))));
    if (ok == true && mounted) {
      final s = c.services.firstWhere((x) => x.id == serviceId);
      await _guard(
          () => c.addCommandItem(
              commandId: command.id,
              serviceId: s.id,
              name: s.name,
              quantity: qty.toDouble(),
              unitPrice: s.price),
          'Serviço adicionado.');
    }
  }

  Future<void> _addProduct(AppCommandModel command) async {
    final name = TextEditingController();
    final value = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        builder: (ctx) => Padding(
            padding: EdgeInsets.fromLTRB(
                20, 14, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
            child: SafeArea(
                top: false,
                child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Center(
                          child: SizedBox(
                              width: 42, child: Divider(thickness: 4))),
                      const Text('Produto extra',
                          style: TextStyle(
                              fontSize: 23, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 16),
                      TextField(
                          controller: name,
                          decoration:
                              const InputDecoration(labelText: 'Produto')),
                      const SizedBox(height: 12),
                      TextField(
                          controller: value,
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true),
                          decoration:
                              const InputDecoration(labelText: 'Valor')),
                      const SizedBox(height: 18),
                      FilledButton(
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Adicionar produto'))
                    ]))));
    if (ok == true && mounted) {
      final price = double.tryParse(value.text.replaceAll(',', '.')) ?? 0;
      if (name.text.trim().isEmpty || price <= 0) {
        showAppError(context, 'Informe produto e valor válidos.');
      } else {
        await _guard(
            () => AppScope.of(context).addCommandItem(
                commandId: command.id,
                name: name.text.trim(),
                quantity: 1,
                unitPrice: price,
                type: 'produto'),
            'Produto adicionado.');
      }
    }
    name.dispose();
    value.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppScope.of(context);
    final selected = _selectedId == null
        ? null
        : c.commands.where((x) => x.id == _selectedId).firstOrNull;
    if (selected != null) return _detail(c, selected);
    final q = _search.text.toLowerCase();
    final items = c.commands
        .where((x) =>
            '${x.clientName} ${x.number} ${x.status}'.toLowerCase().contains(q))
        .toList();
    final open = c.commands.where((x) => x.status == 'aberta').toList();
    return RefreshIndicator(
        onRefresh: c.refreshCommands,
        child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 28),
            children: [
              Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                      color: AppColors.ink,
                      borderRadius: BorderRadius.circular(23)),
                  child: Row(children: [
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          const Text('CONTROLE RÁPIDO',
                              style: TextStyle(
                                  color: AppColors.gold,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.5)),
                          const SizedBox(height: 8),
                          Text('${open.length} abertas',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 28,
                                  fontWeight: FontWeight.w900))
                        ])),
                    Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('TOTAL ABERTO',
                              style: TextStyle(
                                  color: Color(0xFFA1A1AA),
                                  fontSize: 9,
                                  fontWeight: FontWeight.w900)),
                          Text(
                              brMoney(open.fold<double>(
                                  0, (sum, x) => sum + x.total)),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900))
                        ])
                  ])),
              const SizedBox(height: 12),
              SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                      onPressed: _busy ? null : _newCommand,
                      icon: const Icon(Icons.add_rounded),
                      label: const Text('Abrir nova comanda'))),
              const SizedBox(height: 14),
              TextField(
                  controller: _search,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                      hintText: 'Buscar comanda',
                      prefixIcon: Icon(Icons.search_rounded))),
              const SizedBox(height: 12),
              if (items.isEmpty)
                _empty()
              else
                ...items.map((x) => Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        child: InkWell(
                            onTap: () => setState(() => _selectedId = x.id),
                            borderRadius: BorderRadius.circular(18),
                            child: Container(
                                padding: const EdgeInsets.all(15),
                                decoration: BoxDecoration(
                                    border: Border.all(color: AppColors.border),
                                    borderRadius: BorderRadius.circular(18)),
                                child: Column(children: [
                                  Row(children: [
                                    Expanded(
                                        child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                          Text(
                                              'COMANDA #${x.number == 0 ? (x.id.length > 4 ? x.id.substring(0, 4) : x.id) : x.number}',
                                              style: const TextStyle(
                                                  color: AppColors.muted,
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w900)),
                                          const SizedBox(height: 3),
                                          Text(x.clientName,
                                              style: const TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w900))
                                        ])),
                                    _Status(x.status)
                                  ]),
                                  const SizedBox(height: 10),
                                  Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(brMoney(x.total),
                                            style: const TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.w900)),
                                        const Icon(Icons.chevron_right_rounded,
                                            color: AppColors.muted)
                                      ])
                                ]))))))
            ]));
  }

  Widget _detail(dynamic c, AppCommandModel command) {
    final items =
        c.commandItems.where((x) => x.commandId == command.id).toList();
    final total = items.fold<double>(0, (sum, x) => sum + x.total);
    final open = command.status == 'aberta';
    return RefreshIndicator(
        onRefresh: c.refreshCommands,
        child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 28),
            children: [
              Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                      onPressed: () => setState(() => _selectedId = null),
                      icon: const Icon(Icons.arrow_back_rounded),
                      label: const Text('Voltar para comandas'))),
              Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                      color: AppColors.ink,
                      borderRadius: BorderRadius.circular(23)),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(
                              child: Text(command.clientName,
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.w900))),
                          _Status(command.status, dark: true)
                        ]),
                        const SizedBox(height: 15),
                        Row(children: [
                          Expanded(
                              child: _Metric(
                                  'SUBTOTAL',
                                  brMoney(command.subtotal == 0
                                      ? total
                                      : command.subtotal))),
                          const SizedBox(width: 8),
                          Expanded(
                              child: _Metric(
                                  'DESCONTO', brMoney(command.discount))),
                          const SizedBox(width: 8),
                          Expanded(
                              child: _Metric('TOTAL',
                                  brMoney(total == 0 ? command.total : total)))
                        ])
                      ])),
              const SizedBox(height: 14),
              const Text('Itens da comanda',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
              const SizedBox(height: 9),
              if (items.isEmpty)
                _empty(text: 'Nenhum item lançado.')
              else
                ...items.map((i) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(17)),
                    child: Row(children: [
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(i.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w900)),
                            Text(
                                '${i.type.toUpperCase()} • Qtd. ${i.quantity.toStringAsFixed(i.quantity % 1 == 0 ? 0 : 1)}',
                                style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800))
                          ])),
                      Text(brMoney(i.total),
                          style: const TextStyle(fontWeight: FontWeight.w900))
                    ]))),
              if (open) ...[
                const SizedBox(height: 6),
                Row(children: [
                  Expanded(
                      child: OutlinedButton.icon(
                          onPressed: _busy ? null : () => _addService(command),
                          icon: const Icon(Icons.content_cut_rounded),
                          label: const Text('Serviço'))),
                  const SizedBox(width: 8),
                  Expanded(
                      child: OutlinedButton.icon(
                          onPressed: _busy ? null : () => _addProduct(command),
                          icon: const Icon(Icons.inventory_2_outlined),
                          label: const Text('Produto')))
                ]),
                const SizedBox(height: 10),
                SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                        onPressed: _busy || items.isEmpty
                            ? null
                            : () => _guard(() => c.closeCommand(command.id),
                                'Comanda enviada para o caixa.'),
                        icon: const Icon(Icons.point_of_sale_rounded),
                        label: const Text('Enviar para o caixa'),
                        style: FilledButton.styleFrom(
                            backgroundColor: AppColors.ink,
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(50))))
              ] else
                Container(
                    padding: const EdgeInsets.all(15),
                    decoration: BoxDecoration(
                        color: AppColors.goldSoft,
                        borderRadius: BorderRadius.circular(17)),
                    child: const Text(
                        'Esta comanda já foi enviada/fechada e não aceita novos itens.',
                        style: TextStyle(
                            color: AppColors.goldDark,
                            fontWeight: FontWeight.w800)))
            ]));
  }

  Widget _empty({String text = 'Nenhuma comanda encontrada.'}) => Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(18)),
      child: Text(text,
          textAlign: TextAlign.center,
          style: const TextStyle(
              color: AppColors.muted, fontWeight: FontWeight.w800)));
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

class _Status extends StatelessWidget {
  const _Status(this.status, {this.dark = false});
  final String status;
  final bool dark;
  @override
  Widget build(BuildContext context) {
    final label = switch (status) {
      'aberta' => 'Aberta',
      'fechada' => 'Fechada',
      'aguardando_pagamento' => 'Aguardando',
      _ => status
    };
    return Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
            color: dark
                ? Colors.white.withValues(alpha: .1)
                : status == 'aberta'
                    ? const Color(0xFFDBEAFE)
                    : status == 'fechada'
                        ? const Color(0xFFD1FAE5)
                        : const Color(0xFFFEF3C7),
            borderRadius: BorderRadius.circular(20)),
        child: Text(label.toUpperCase(),
            style: TextStyle(
                color: dark
                    ? Colors.white
                    : status == 'aberta'
                        ? const Color(0xFF1D4ED8)
                        : status == 'fechada'
                            ? const Color(0xFF047857)
                            : const Color(0xFFA16207),
                fontSize: 9,
                fontWeight: FontWeight.w900)));
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);
  final String label, value;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .1),
          borderRadius: BorderRadius.circular(14)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(
                color: Color(0xFFA1A1AA),
                fontSize: 8,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 3),
        Text(value,
            style: const TextStyle(
                color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900))
      ]));
}
