import 'package:flutter/material.dart';
import '../../core/api/professional_api.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../data/api_models.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final _search = TextEditingController();
  bool _busy = false;
  static const _pageSize = 10;
  int _page = 1;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _edit({AppServiceModel? service}) async {
    final name = TextEditingController(text: service?.name ?? '');
    final price = TextEditingController(
      text: service == null
          ? ''
          : service.price.toStringAsFixed(2).replaceAll('.', ','),
    );
    final duration = TextEditingController(
        text: service?.durationMinutes.toString() ?? '60');
    final description = TextEditingController(text: service?.description ?? '');

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
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
                  child: SizedBox(width: 42, child: Divider(thickness: 4))),
              Text(
                service == null ? 'Novo serviço' : 'Editar serviço',
                style:
                    const TextStyle(fontSize: 23, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 16),
              TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Nome')),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: price,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Preço'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: duration,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(labelText: 'Duração (min)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: description,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Descrição'),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Salvar serviço'),
              ),
            ],
          ),
        ),
      ),
    );

    if (ok == true && mounted) {
      final normalizedPrice =
          price.text.trim().replaceAll('.', '').replaceAll(',', '.');
      final parsedPrice = double.tryParse(normalizedPrice) ?? 0;
      final parsedMinutes = int.tryParse(duration.text.trim()) ?? 0;

      if (name.text.trim().isEmpty || parsedPrice <= 0 || parsedMinutes <= 0) {
        showAppError(context, 'Informe nome, preço e duração válidos.');
      } else {
        setState(() => _busy = true);
        try {
          final controller = AppScope.of(context);
          if (service == null) {
            await controller.createService(
              name: name.text.trim(),
              price: parsedPrice,
              duration: parsedMinutes,
              description: description.text.trim(),
            );
          } else {
            await controller.editService(
              id: service.id,
              name: name.text.trim(),
              price: parsedPrice,
              duration: parsedMinutes,
              description: description.text.trim(),
            );
          }
          if (mounted) showAppSuccess(context, 'Serviço salvo.');
        } on ApiException catch (e) {
          if (mounted) showAppError(context, e.message);
        } finally {
          if (mounted) setState(() => _busy = false);
        }
      }
    }

    name.dispose();
    price.dispose();
    duration.dispose();
    description.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final query = _search.text.trim().toLowerCase();
    final items = controller.services
        .where((service) => '${service.name} ${service.description}'
            .toLowerCase()
            .contains(query))
        .toList();
    final totalPages = (items.length / _pageSize).ceil().clamp(1, 999);
    if (_page > totalPages) _page = totalPages;
    final pageItems =
        items.skip((_page - 1) * _pageSize).take(_pageSize).toList();

    return RefreshIndicator(
      onRefresh: controller.refreshData,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          FilledButton.icon(
            onPressed: _busy ? null : () => _edit(),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Novo serviço'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(56),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(22)),
            ),
          ),
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
                  offset: Offset(0, 10),
                )
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('CATÁLOGO PROFISSIONAL',
                              style: TextStyle(
                                  color: AppColors.goldDark,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.8)),
                          SizedBox(height: 5),
                          Text('Meus serviços',
                              style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -1.0)),
                          SizedBox(height: 4),
                          Text(
                            'Gerencie nomes, preços, duração e descrição.',
                            style: TextStyle(
                                color: AppColors.muted,
                                fontWeight: FontWeight.w700,
                                height: 1.35),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 13, vertical: 7),
                      decoration: BoxDecoration(
                        color: AppColors.ink,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${items.length}',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w900),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _search,
                  onChanged: (_) => setState(() => _page = 1),
                  decoration: const InputDecoration(
                    hintText: 'Buscar serviço',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (items.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Text(
                'Nenhum serviço encontrado.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: AppColors.muted, fontWeight: FontWeight.w800),
              ),
            )
          else
            ...pageItems.map(
              (service) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(25),
                  border: Border.all(color: AppColors.border),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0D0F172A),
                      blurRadius: 22,
                      offset: Offset(0, 8),
                    )
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppColors.goldSoft,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    '${service.durationMinutes} min · ${_durationLabel(service.durationMinutes)}',
                                    style: const TextStyle(
                                      color: AppColors.goldDark,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  service.name,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    height: 1.2,
                                    letterSpacing: -.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 13, vertical: 9),
                            decoration: BoxDecoration(
                              color: AppColors.ink,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text(
                              brMoney(service.price),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(13),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAFAFA),
                          borderRadius: BorderRadius.circular(17),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'DESCRIÇÃO',
                              style: TextStyle(
                                color: AppColors.muted,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.3,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              service.description.isEmpty
                                  ? 'Sem descrição cadastrada.'
                                  : service.description,
                              style: const TextStyle(
                                color: AppColors.zinc700,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                height: 1.35,
                              ),
                            ),
                          ],
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
                          onPressed:
                              _busy ? null : () => _edit(service: service),
                          icon: const Icon(Icons.edit_rounded, size: 16),
                          label: const Text('Editar serviço'),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (items.length > _pageSize) ...[
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
          ],
        ],
      ),
    );
  }
}

String _durationLabel(int minutes) {
  if (minutes < 60) return '${minutes}min';
  final hours = minutes ~/ 60;
  final rest = minutes % 60;
  if (rest == 0) return '${hours}h';
  return '${hours}h${rest.toString().padLeft(2, '0')}';
}
