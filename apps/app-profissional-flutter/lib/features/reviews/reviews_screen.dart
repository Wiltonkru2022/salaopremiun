import 'package:flutter/material.dart';
import '../../core/api/professional_api.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';

class ReviewsScreen extends StatefulWidget {
  const ReviewsScreen({super.key});

  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  bool _busy = false;

  Future<void> _delete(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Excluir avaliação?'),
        content: const Text('Essa ação remove a avaliação do sistema.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Excluir')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await AppScope.of(context).deleteReview(id);
      if (mounted) showAppSuccess(context, 'Avaliação excluída.');
    } on ApiException catch (e) {
      if (mounted) showAppError(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final average = controller.reviews.isEmpty
        ? 0.0
        : controller.reviews.fold<int>(0, (sum, item) => sum + item.rating) /
            controller.reviews.length;

    return RefreshIndicator(
      onRefresh: controller.refreshReviews,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
                color: AppColors.ink, borderRadius: BorderRadius.circular(23)),
            child: Row(
              children: [
                const Icon(Icons.star_rounded, color: AppColors.gold, size: 38),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      average.toStringAsFixed(1),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 30,
                          fontWeight: FontWeight.w900),
                    ),
                    Text(
                      '${controller.reviews.length} avaliações',
                      style: const TextStyle(
                          color: Color(0xFFD4D4D8),
                          fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (controller.reviews.isEmpty)
            _empty()
          else
            ...controller.reviews.map(
              (review) => Container(
                margin: const EdgeInsets.only(bottom: 9),
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            review.clientName,
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w900),
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: List.generate(
                            5,
                            (index) => Icon(
                              Icons.star_rounded,
                              size: 16,
                              color: index < review.rating
                                  ? AppColors.gold
                                  : const Color(0xFFE4E4E7),
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: _busy ? null : () => _delete(review.id),
                          icon: const Icon(Icons.delete_outline_rounded,
                              color: Colors.red, size: 20),
                        ),
                      ],
                    ),
                    Text(
                      '${review.serviceName} • ${brDay(review.createdAt)}',
                      style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 11,
                          fontWeight: FontWeight.w700),
                    ),
                    if (review.comment.isNotEmpty) ...[
                      const SizedBox(height: 9),
                      Text(review.comment,
                          style: const TextStyle(
                              height: 1.45, fontWeight: FontWeight.w700)),
                    ],
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
          'Nenhuma avaliação encontrada.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.muted, fontWeight: FontWeight.w800),
        ),
      );
}
