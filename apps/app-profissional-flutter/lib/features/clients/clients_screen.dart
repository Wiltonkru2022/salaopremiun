import 'package:flutter/material.dart';
import '../../core/api/professional_api.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../data/api_models.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});
  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  final _search = TextEditingController();
  String? _selectedId;
  bool _busy = false;
  static const _pageSize = 10;
  int _page = 1;
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _edit({AppClientModel? client}) async {
    final name = TextEditingController(text: client?.name ?? '');
    final phone = TextEditingController(text: client?.bestPhone ?? '');
    final notes = TextEditingController(text: client?.notes ?? '');
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
                      Text(client == null ? 'Nova cliente' : 'Editar cliente',
                          style: const TextStyle(
                              fontSize: 23, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 16),
                      TextField(
                          controller: name,
                          decoration: const InputDecoration(labelText: 'Nome')),
                      const SizedBox(height: 12),
                      TextField(
                          controller: phone,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                              labelText: 'Telefone / WhatsApp')),
                      const SizedBox(height: 12),
                      TextField(
                          controller: notes,
                          maxLines: 3,
                          decoration:
                              const InputDecoration(labelText: 'Observações')),
                      const SizedBox(height: 18),
                      FilledButton(
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Salvar cliente'))
                    ]))));
    if (ok == true && mounted) {
      if (name.text.trim().isEmpty) {
        showAppError(context, 'Informe o nome da cliente.');
      } else {
        setState(() => _busy = true);
        try {
          final c = AppScope.of(context);
          if (client == null) {
            await c.createClient(
                name: name.text.trim(),
                phone: phone.text.trim(),
                notes: notes.text.trim());
          } else {
            await c.editClient(
                id: client.id,
                name: name.text.trim(),
                phone: phone.text.trim(),
                notes: notes.text.trim());
          }
          if (mounted) showAppSuccess(context, 'Cliente salva.');
        } on ApiException catch (e) {
          if (mounted) showAppError(context, e.message);
        } finally {
          if (mounted) setState(() => _busy = false);
        }
      }
    }
    name.dispose();
    phone.dispose();
    notes.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppScope.of(context);
    final q = _search.text.trim().toLowerCase();
    final qDigits = _digits(q);
    final clients = c.clients
        .where((x) =>
            x.name.toLowerCase().contains(q) ||
            (qDigits.isNotEmpty && _digits(x.bestPhone).contains(qDigits)))
        .toList();
    final totalPages = (clients.length / _pageSize).ceil().clamp(1, 999);
    if (_page > totalPages) _page = totalPages;
    final pageItems =
        clients.skip((_page - 1) * _pageSize).take(_pageSize).toList();
    final selected = _selectedId == null
        ? null
        : c.clients.where((x) => x.id == _selectedId).firstOrNull;
    if (selected != null) return _detail(c, selected);
    return RefreshIndicator(
        onRefresh: c.refreshData,
        child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 28),
            children: [
              FilledButton.icon(
                  onPressed: _busy ? null : () => _edit(),
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Novo cliente'),
                  style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(56),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(22)))),
              const SizedBox(height: 14),
              Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(26),
                      boxShadow: const [
                        BoxShadow(
                            color: Color(0x0E0F172A),
                            blurRadius: 28,
                            offset: Offset(0, 10))
                      ]),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          const Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Text('SUA BASE DE CLIENTES',
                                    style: TextStyle(
                                        color: AppColors.goldDark,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1.8)),
                                SizedBox(height: 5),
                                Text('Clientes',
                                    style: TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: -1.0)),
                                SizedBox(height: 4),
                                Text(
                                    'Encontre rapidamente e consulte o histórico.',
                                    style: TextStyle(
                                        color: AppColors.muted,
                                        fontWeight: FontWeight.w700,
                                        height: 1.35))
                              ])),
                          Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 13, vertical: 7),
                              decoration: BoxDecoration(
                                  color: AppColors.ink,
                                  borderRadius: BorderRadius.circular(999)),
                              child: Text('${clients.length}',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w900)))
                        ]),
                        const SizedBox(height: 16),
                        TextField(
                            controller: _search,
                            onChanged: (_) => setState(() => _page = 1),
                            decoration: const InputDecoration(
                                hintText: 'Buscar por nome ou WhatsApp',
                                prefixIcon: Icon(Icons.search_rounded)))
                      ])),
              const SizedBox(height: 14),
              if (clients.isEmpty)
                _empty()
              else
                ...pageItems.map((client) {
                  final history = c.appointments
                      .where((a) => a.clientId == client.id)
                      .toList()
                    ..sort((a, b) {
                      final dateCompare = b.date.compareTo(a.date);
                      if (dateCompare != 0) return dateCompare;
                      return b.start.compareTo(a.start);
                    });
                  final last = history.firstOrNull;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(25),
                      child: InkWell(
                        onTap: () => setState(() => _selectedId = client.id),
                        borderRadius: BorderRadius.circular(25),
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.border),
                            borderRadius: BorderRadius.circular(25),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x0D0F172A),
                                blurRadius: 22,
                                offset: Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Column(
                            children: [
                              Padding(
                                padding:
                                    const EdgeInsets.fromLTRB(18, 18, 18, 14),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: AppColors.ink,
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: const Icon(Icons.phone_rounded,
                                          color: Colors.white, size: 19),
                                    ),
                                    const SizedBox(width: 13),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            client.name,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 17,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: -.3,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            client.bestPhone.isEmpty
                                                ? 'Sem WhatsApp'
                                                : client.bestPhone,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              color: AppColors.muted,
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF4F4F5),
                                        borderRadius:
                                            BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        '${history.length} ag.',
                                        style: const TextStyle(
                                          color: AppColors.muted,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (last != null)
                                Padding(
                                  padding:
                                      const EdgeInsets.fromLTRB(18, 0, 18, 14),
                                  child: Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 13, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFAFAFA),
                                      borderRadius: BorderRadius.circular(17),
                                    ),
                                    child: Text(
                                      'Último horário: ${brDay(last.date)} às ${last.start}',
                                      style: const TextStyle(
                                        color: AppColors.muted,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 11),
                                decoration: const BoxDecoration(
                                  border: Border(
                                    top: BorderSide(color: Color(0xFFF4F4F5)),
                                  ),
                                ),
                                child: SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    onPressed: _busy
                                        ? null
                                        : () => _edit(client: client),
                                    icon: const Icon(Icons.edit_rounded,
                                        size: 16),
                                    label: const Text('Editar dados'),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              if (clients.length > _pageSize) ...[
                const SizedBox(height: 2),
                Row(children: [
                  Expanded(
                      child: OutlinedButton(
                          onPressed:
                              _page == 1 ? null : () => setState(() => _page--),
                          child: const Text('Anterior'))),
                  const SizedBox(width: 8),
                  Expanded(
                      child: OutlinedButton(
                          onPressed: _page == totalPages
                              ? null
                              : () => setState(() => _page++),
                          child: const Text('Próxima')))
                ])
              ]
            ]));
  }

  Widget _detail(dynamic c, AppClientModel client) {
    final history =
        c.appointments.where((a) => a.clientId == client.id).toList()
          ..sort((a, b) {
            final dateCompare = b.date.compareTo(a.date);
            if (dateCompare != 0) return dateCompare;
            return b.start.compareTo(a.start);
          });
    return ListView(padding: const EdgeInsets.only(bottom: 28), children: [
      Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
              onPressed: () => setState(() => _selectedId = null),
              icon: const Icon(Icons.arrow_back_rounded),
              label: const Text('Voltar para clientes'))),
      Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
              color: AppColors.ink, borderRadius: BorderRadius.circular(23)),
          child: Row(children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(client.name,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 25,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(height: 5),
                  Text(
                      client.bestPhone.isEmpty
                          ? 'Sem WhatsApp'
                          : client.bestPhone,
                      style: const TextStyle(
                          color: Color(0xFFD4D4D8),
                          fontWeight: FontWeight.w700))
                ])),
            FilledButton.icon(
                onPressed: _busy ? null : () => _edit(client: client),
                style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.ink),
                icon: const Icon(Icons.edit_rounded),
                label: const Text('Editar'))
          ])),
      const SizedBox(height: 14),
      Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(19)),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('OBSERVAÇÕES',
                style: TextStyle(
                    color: AppColors.muted,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.3)),
            const SizedBox(height: 7),
            Text(
                client.notes.isEmpty
                    ? 'Nenhuma observação cadastrada.'
                    : client.notes,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, height: 1.45))
          ])),
      const SizedBox(height: 14),
      const Text('Histórico',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
      const SizedBox(height: 9),
      if (history.isEmpty)
        _empty(text: 'Nenhum atendimento encontrado.')
      else
        ...history.map((a) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(17),
                border: Border.all(color: AppColors.border)),
            child: Row(children: [
              Container(
                  width: 52,
                  height: 52,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                      color: const Color(0xFFF4F4F5),
                      borderRadius: BorderRadius.circular(14)),
                  child: Text(a.start,
                      style: const TextStyle(fontWeight: FontWeight.w900))),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(a.serviceName,
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    Text('${brDay(a.date)} • ${a.status}',
                        style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 11,
                            fontWeight: FontWeight.w700))
                  ])),
              Text(brMoney(a.price),
                  style: const TextStyle(fontWeight: FontWeight.w900))
            ])))
    ]);
  }

  Widget _empty({String text = 'Nenhuma cliente encontrada.'}) => Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border)),
      child: Text(text,
          textAlign: TextAlign.center,
          style: const TextStyle(
              color: AppColors.muted, fontWeight: FontWeight.w800)));
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

String _digits(String value) => value.replaceAll(RegExp(r'\D'), '');
