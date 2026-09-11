import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/professional_api.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../data/api_models.dart';

class CouponsScreen extends StatefulWidget {
  const CouponsScreen({super.key});

  @override
  State<CouponsScreen> createState() => _CouponsScreenState();
}

class _CouponsScreenState extends State<CouponsScreen> {
  bool _busy = false;

  Future<void> _create() async {
    final controller = AppScope.of(context);
    final eligible = controller.clients
        .where((client) =>
            client.bestPhone.replaceAll(RegExp(r'\D'), '').length >= 10)
        .toList();

    if (eligible.isEmpty) {
      showAppError(context, 'Nenhuma cliente com WhatsApp válido.');
      return;
    }

    final name = TextEditingController();
    final description = TextEditingController();
    final discountValue = TextEditingController(text: '10');
    final totalLimit = TextEditingController(text: '1');
    String discountType = 'percentual';
    DateTime? validUntil;
    final selected = <String>{};
    final clientSearch = TextEditingController();

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setModalState) {
          final query = clientSearch.text.trim().toLowerCase();
          final visibleClients = eligible
              .where((client) =>
                  client.name.toLowerCase().contains(query) ||
                  client.bestPhone
                      .replaceAll(RegExp(r'\D'), '')
                      .contains(query.replaceAll(RegExp(r'\D'), '')))
              .toList();
          return Padding(
            padding: EdgeInsets.fromLTRB(
              20,
              14,
              20,
              MediaQuery.viewInsetsOf(context).bottom + 24,
            ),
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(
                        child:
                            SizedBox(width: 42, child: Divider(thickness: 4))),
                    const Text('Novo cupom',
                        style: TextStyle(
                            fontSize: 23, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 14),
                    TextField(
                        controller: name,
                        decoration:
                            const InputDecoration(labelText: 'Nome do cupom')),
                    const SizedBox(height: 10),
                    TextField(
                        controller: description,
                        decoration:
                            const InputDecoration(labelText: 'Descrição')),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _Segment(
                            value: discountType,
                            labels: const {
                              'percentual': 'Percentual',
                              'valor_fixo': 'Valor R\$',
                            },
                            onChanged: (value) =>
                                setModalState(() => discountType = value),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: discountValue,
                            keyboardType: const TextInputType.numberWithOptions(
                                decimal: true),
                            decoration:
                                const InputDecoration(labelText: 'Desconto'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final date = await showDatePicker(
                                context: context,
                                firstDate: DateTime.now(),
                                lastDate: DateTime.now()
                                    .add(const Duration(days: 730)),
                                initialDate: validUntil ??
                                    DateTime.now()
                                        .add(const Duration(days: 30)),
                              );
                              if (date != null) {
                                setModalState(() => validUntil = date);
                              }
                            },
                            icon: const Icon(Icons.calendar_month_rounded),
                            label: Text(validUntil == null
                                ? 'Validade'
                                : brDay(validUntil)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: totalLimit,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                                labelText: 'Limite total'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'CLIENTES COM WHATSAPP',
                            style: TextStyle(
                              color: AppColors.muted,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: () => setModalState(() {
                            selected
                              ..clear()
                              ..addAll(
                                  visibleClients.map((client) => client.id));
                          }),
                          child: const Text('Selecionar todas'),
                        ),
                      ],
                    ),
                    TextField(
                      controller: clientSearch,
                      onChanged: (_) => setModalState(() {}),
                      decoration: const InputDecoration(
                        hintText: 'Buscar cliente',
                        prefixIcon: Icon(Icons.search_rounded),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      constraints: const BoxConstraints(maxHeight: 220),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: ListView(
                        shrinkWrap: true,
                        children: visibleClients
                            .map(
                              (client) => CheckboxListTile(
                                value: selected.contains(client.id),
                                onChanged: (value) => setModalState(() {
                                  if (value == true) {
                                    selected.add(client.id);
                                  } else {
                                    selected.remove(client.id);
                                  }
                                }),
                                title: Text(client.name,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w900)),
                                subtitle: Text(client.bestPhone),
                                controlAffinity:
                                    ListTileControlAffinity.leading,
                              ),
                            )
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => Navigator.pop(sheetContext, true),
                      child: const Text('Criar e preparar envios'),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );

    if (ok == true && mounted) {
      final parsedDiscount =
          double.tryParse(discountValue.text.trim().replaceAll(',', '.')) ?? 0;
      final parsedLimit = int.tryParse(totalLimit.text.trim()) ?? 1;
      if (name.text.trim().isEmpty ||
          parsedDiscount <= 0 ||
          validUntil == null ||
          selected.isEmpty) {
        showAppError(context,
            'Preencha nome, desconto, validade e selecione pelo menos uma cliente.');
      } else {
        setState(() => _busy = true);
        try {
          final recipients = await controller.createCoupon(
            name: name.text.trim(),
            description: description.text.trim(),
            discountType: discountType,
            discountValue: parsedDiscount,
            validUntil: isoDay(validUntil!),
            totalLimit: parsedLimit < 1 ? 1 : parsedLimit,
            clientIds: selected.toList(),
          );
          if (mounted) {
            showAppSuccess(
                context, 'Cupom criado para ${recipients.length} cliente(s).');
            if (recipients.isNotEmpty) {
              await _showRecipients(
                recipients,
                couponName: name.text.trim(),
                discountType: discountType,
                discountValue: parsedDiscount,
                validUntil: validUntil!,
              );
            }
          }
        } on ApiException catch (e) {
          if (mounted) showAppError(context, e.message);
        } finally {
          if (mounted) setState(() => _busy = false);
        }
      }
    }

    name.dispose();
    description.dispose();
    discountValue.dispose();
    totalLimit.dispose();
    clientSearch.dispose();
  }

  Future<void> _showRecipients(
    List<CouponRecipient> recipients, {
    required String couponName,
    required String discountType,
    required double discountValue,
    required DateTime validUntil,
  }) async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Center(
                  child: SizedBox(width: 42, child: Divider(thickness: 4))),
              const Text('Enviar cupons',
                  style: TextStyle(fontSize: 23, fontWeight: FontWeight.w900)),
              const SizedBox(height: 5),
              const Text(
                'Cada cliente recebe um link exclusivo de resgate.',
                style: TextStyle(
                    color: AppColors.muted, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 360),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: recipients.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final recipient = recipients[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(recipient.name,
                          style: const TextStyle(fontWeight: FontWeight.w900)),
                      subtitle: Text(recipient.whatsapp),
                      trailing: IconButton.filledTonal(
                        onPressed: () => _openWhatsApp(
                          recipient,
                          couponName: couponName,
                          discountType: discountType,
                          discountValue: discountValue,
                          validUntil: validUntil,
                        ),
                        icon: const Icon(Icons.send_rounded),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openWhatsApp(
    CouponRecipient recipient, {
    required String couponName,
    required String discountType,
    required double discountValue,
    required DateTime validUntil,
  }) async {
    var digits = recipient.whatsapp.replaceAll(RegExp(r'\D'), '');
    if (digits.length <= 11) digits = '55$digits';
    final firstName = recipient.name.trim().split(RegExp(r'\s+')).first;
    final benefit = discountType == 'valor_fixo'
        ? '${brMoney(discountValue)} de desconto'
        : '${discountValue.toStringAsFixed(discountValue % 1 == 0 ? 0 : 1)}% de desconto';
    final redemptionLink =
        'https://app.salaopremiun.com.br/resgatar-cupom/${Uri.encodeComponent(recipient.token)}';
    final message =
        'Oi, $firstName! 🎁 Você ganhou um cupom especial: $couponName. '
        'Benefício: $benefit. Válido até ${brDay(validUntil)}. '
        'Resgate pelo seu link exclusivo: $redemptionLink';
    final uri =
        Uri.parse('https://wa.me/$digits?text=${Uri.encodeComponent(message)}');

    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      showAppError(context, 'Não foi possível abrir o WhatsApp.');
    }
  }

  Future<void> _details(AppCouponModel coupon) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (sheetContext) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Center(
                  child: SizedBox(width: 42, child: Divider(thickness: 4))),
              Text(coupon.name,
                  style: const TextStyle(
                      fontSize: 23, fontWeight: FontWeight.w900)),
              Text(coupon.code,
                  style: const TextStyle(
                      color: AppColors.muted, fontWeight: FontWeight.w700)),
              const SizedBox(height: 14),
              _Info(
                'BENEFÍCIO',
                coupon.discountType == 'valor_fixo'
                    ? brMoney(coupon.discountValue)
                    : '${coupon.discountValue.toStringAsFixed(0)}%',
              ),
              _Info('VALIDADE', brDay(coupon.validUntil)),
              _Info(
                'ENVIADOS / RESGATADOS / USADOS',
                '${coupon.sent} / ${coupon.redeemed} / ${coupon.used}',
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _busy
                    ? null
                    : () async {
                        Navigator.pop(sheetContext);
                        setState(() => _busy = true);
                        try {
                          await AppScope.of(context)
                              .toggleCoupon(coupon.id, !coupon.active);
                        } on ApiException catch (e) {
                          if (mounted) showAppError(context, e.message);
                        } finally {
                          if (mounted) setState(() => _busy = false);
                        }
                      },
                icon: Icon(coupon.active
                    ? Icons.pause_circle_outline
                    : Icons.play_circle_outline),
                label: Text(
                    coupon.active ? 'Desativar campanha' : 'Reativar campanha'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _busy
                    ? null
                    : () async {
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (dialogContext) => AlertDialog(
                            title: const Text('Excluir campanha?'),
                            content:
                                const Text('Essa ação não pode ser desfeita.'),
                            actions: [
                              TextButton(
                                onPressed: () =>
                                    Navigator.pop(dialogContext, false),
                                child: const Text('Cancelar'),
                              ),
                              FilledButton(
                                onPressed: () =>
                                    Navigator.pop(dialogContext, true),
                                child: const Text('Excluir'),
                              ),
                            ],
                          ),
                        );
                        if (confirmed == true && mounted) {
                          if (sheetContext.mounted) Navigator.pop(sheetContext);
                          setState(() => _busy = true);
                          try {
                            await AppScope.of(context).deleteCoupon(coupon.id);
                          } on ApiException catch (e) {
                            if (mounted) showAppError(context, e.message);
                          } finally {
                            if (mounted) setState(() => _busy = false);
                          }
                        }
                      },
                style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                icon: const Icon(Icons.delete_outline_rounded),
                label: const Text('Excluir campanha'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return RefreshIndicator(
      onRefresh: controller.refreshCoupons,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.goldSoft,
              borderRadius: BorderRadius.circular(23),
              border: Border.all(color: const Color(0xFFF2D393)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'RELACIONAMENTO',
                  style: TextStyle(
                    color: AppColors.goldDark,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text('Cupons privados',
                    style:
                        TextStyle(fontSize: 25, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                const Text(
                  'Crie e acompanhe campanhas exclusivas pelo WhatsApp.',
                  style: TextStyle(
                      color: AppColors.muted, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 13),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _create,
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Criar cupom'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (controller.coupons.isEmpty)
            _empty()
          else
            ...controller.coupons.map(
              (coupon) => Container(
                margin: const EdgeInsets.only(bottom: 9),
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(coupon.name,
                                  style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w900)),
                              Text(
                                '${coupon.discountType == 'valor_fixo' ? brMoney(coupon.discountValue) : '${coupon.discountValue.toStringAsFixed(0)}%'} • ${brDay(coupon.validUntil)}',
                                style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 9, vertical: 5),
                          decoration: BoxDecoration(
                            color: coupon.active
                                ? const Color(0xFFECFDF5)
                                : const Color(0xFFF4F4F5),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            coupon.active ? 'ATIVA' : 'PAUSADA',
                            style: TextStyle(
                              color: coupon.active
                                  ? const Color(0xFF047857)
                                  : AppColors.muted,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _Stat('ENVIADOS', coupon.sent)),
                        Expanded(child: _Stat('RESGATADOS', coupon.redeemed)),
                        Expanded(child: _Stat('USADOS', coupon.used)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _busy ? null : () => _details(coupon),
                        icon: const Icon(Icons.visibility_outlined),
                        label: const Text('Ver detalhes'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _empty() => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(18),
        ),
        child: const Text(
          'Nenhuma campanha criada.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.muted, fontWeight: FontWeight.w800),
        ),
      );
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
                      height: 48,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: entry.key == value
                            ? AppColors.ink
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        entry.value,
                        style: TextStyle(
                          color: entry.key == value
                              ? Colors.white
                              : AppColors.muted,
                          fontSize: 12,
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

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value);
  final String label;
  final int value;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Text('$value',
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          Text(label,
              style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 8,
                  fontWeight: FontWeight.w900)),
        ],
      );
}

class _Info extends StatelessWidget {
  const _Info(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: const Color(0xFFFAFAFA),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 9,
                    fontWeight: FontWeight.w900),
              ),
            ),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w900)),
          ],
        ),
      );
}
