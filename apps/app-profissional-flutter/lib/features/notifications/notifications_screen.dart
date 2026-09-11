import 'package:flutter/material.dart';
import '../../core/api/professional_api.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _busy = false;
  @override
  Widget build(BuildContext context) {
    final c = AppScope.of(context);
    return RefreshIndicator(
        onRefresh: c.refreshData,
        child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 28),
            children: [
              Row(children: [
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      const Text('Notificações',
                          style: TextStyle(
                              fontSize: 24, fontWeight: FontWeight.w900)),
                      Text('${c.unreadCount} não lidas',
                          style: const TextStyle(
                              color: AppColors.muted,
                              fontWeight: FontWeight.w700))
                    ])),
                TextButton.icon(
                    onPressed: _busy || c.unreadCount == 0
                        ? null
                        : () async {
                            final messenger = ScaffoldMessenger.of(context);
                            setState(() => _busy = true);
                            try {
                              await c.markAllNotificationsRead();
                            } on ApiException catch (e) {
                              if (mounted) {
                                messenger.showSnackBar(SnackBar(
                                  content: Text(e.message),
                                  behavior: SnackBarBehavior.floating,
                                ));
                              }
                            } finally {
                              if (mounted) setState(() => _busy = false);
                            }
                          },
                    icon: const Icon(Icons.done_all_rounded),
                    label: const Text('Marcar todas'))
              ]),
              const SizedBox(height: 12),
              if (c.notifications.isEmpty)
                Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(18)),
                    child: const Text('Nenhuma notificação.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: AppColors.muted,
                            fontWeight: FontWeight.w800)))
              else
                ...c.notifications.map((n) => Material(
                    color: n.read ? Colors.white : AppColors.goldSoft,
                    borderRadius: BorderRadius.circular(18),
                    child: InkWell(
                        onTap: n.read || _busy
                            ? null
                            : () async {
                                final messenger = ScaffoldMessenger.of(context);
                                setState(() => _busy = true);
                                try {
                                  await c.markNotificationRead(n.id);
                                } on ApiException catch (e) {
                                  if (mounted) {
                                    messenger.showSnackBar(SnackBar(
                                      content: Text(e.message),
                                      behavior: SnackBarBehavior.floating,
                                    ));
                                  }
                                } finally {
                                  if (mounted) setState(() => _busy = false);
                                }
                              },
                        borderRadius: BorderRadius.circular(18),
                        child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(15),
                            decoration: BoxDecoration(
                                border: Border.all(
                                    color: n.read
                                        ? AppColors.border
                                        : const Color(0xFFF2D393)),
                                borderRadius: BorderRadius.circular(18)),
                            child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                      width: 42,
                                      height: 42,
                                      decoration: BoxDecoration(
                                          color: n.read
                                              ? const Color(0xFFF4F4F5)
                                              : AppColors.gold,
                                          borderRadius:
                                              BorderRadius.circular(13)),
                                      child: Icon(
                                          n.read
                                              ? Icons.notifications_none_rounded
                                              : Icons
                                                  .notifications_active_rounded,
                                          size: 20)),
                                  const SizedBox(width: 11),
                                  Expanded(
                                      child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                        Row(children: [
                                          Expanded(
                                              child: Text(n.title,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w900))),
                                          if (!n.read)
                                            Container(
                                                width: 8,
                                                height: 8,
                                                decoration: const BoxDecoration(
                                                    color: AppColors.goldDark,
                                                    shape: BoxShape.circle))
                                        ]),
                                        const SizedBox(height: 4),
                                        Text(n.message,
                                            style: const TextStyle(
                                                color: Color(0xFF52525B),
                                                height: 1.4,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700)),
                                        const SizedBox(height: 5),
                                        Text(brDay(n.createdAt),
                                            style: const TextStyle(
                                                color: AppColors.muted,
                                                fontSize: 10,
                                                fontWeight: FontWeight.w700))
                                      ]))
                                ])))))
            ]));
  }
}
