import 'package:flutter/material.dart';
import '../../core/navigation/app_section.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/brand_logo.dart';
import '../agenda/agenda_screen.dart';
import '../clients/clients_screen.dart';
import '../services/services_screen.dart';
import '../tickets/tickets_screen.dart';
import '../home/home_screen.dart';
import '../coupons/coupons_screen.dart';
import '../commission/commission_screen.dart';
import '../reviews/reviews_screen.dart';
import '../notifications/notifications_screen.dart';
import '../profile/profile_screen.dart';
import '../settings/settings_screen.dart';
import '../support/support_screen.dart';

class ProfessionalShell extends StatefulWidget {
  const ProfessionalShell({super.key, required this.onLogout});
  final VoidCallback onLogout;

  @override
  State<ProfessionalShell> createState() => _ProfessionalShellState();
}

class _ProfessionalShellState extends State<ProfessionalShell> {
  AppSection _section = AppSection.inicio;
  final List<AppSection> _history = [];
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  void _select(AppSection section) {
    if (section != _section) {
      setState(() {
        _history.add(_section);
        _section = section;
      });
    }
    if (_scaffoldKey.currentState?.isDrawerOpen ?? false) {
      Navigator.of(context).pop();
    }
  }

  void _handleBack() {
    if (_scaffoldKey.currentState?.isDrawerOpen ?? false) {
      Navigator.of(context).pop();
      return;
    }

    if (_history.isNotEmpty) {
      setState(() => _section = _history.removeLast());
      return;
    }

    if (_section != AppSection.inicio) {
      setState(() => _section = AppSection.inicio);
    }
  }

  Widget _content() {
    return switch (_section) {
      AppSection.inicio => HomeScreen(onNavigate: _select),
      AppSection.agenda => const AgendaScreen(),
      AppSection.clientes => const ClientsScreen(),
      AppSection.servicos => const ServicesScreen(),
      AppSection.comandas => const TicketsScreen(),
      AppSection.cupons => const CouponsScreen(),
      AppSection.comissao => const CommissionScreen(),
      AppSection.avaliacoes => const ReviewsScreen(),
      AppSection.notificacoes => const NotificationsScreen(),
      AppSection.perfil => ProfileScreen(onNavigate: _select),
      AppSection.configuracoes => const SettingsScreen(),
      AppSection.suporte => const SupportScreen(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final unread = controller.unreadCount;
    final professionalName = controller.profile?.name.trim().isNotEmpty == true
        ? controller.profile!.name.trim()
        : 'Profissional';

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        final navigation = _SideMenu(
          current: _section,
          unread: unread,
          professionalName: professionalName,
          onSelect: _select,
          onLogout: widget.onLogout,
          showClose: !wide,
        );

        return PopScope(
          canPop: _section == AppSection.inicio && _history.isEmpty,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) _handleBack();
          },
          child: Scaffold(
            key: _scaffoldKey,
            backgroundColor: AppColors.background,
            drawer: wide ? null : Drawer(width: 304, child: navigation),
            body: Row(
              children: [
                if (wide) SizedBox(width: 304, child: navigation),
                if (wide)
                  const VerticalDivider(width: 1, color: AppColors.border),
                Expanded(
                  child: Column(
                    children: [
                      _Header(
                        section: _section,
                        unread: unread,
                        onNotifications: () => _select(AppSection.notificacoes),
                        onMenu: wide
                            ? null
                            : () => _scaffoldKey.currentState?.openDrawer(),
                      ),
                      Expanded(
                        child: Align(
                          alignment: Alignment.topCenter,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 770),
                            child: Padding(
                              padding: EdgeInsets.fromLTRB(
                                16,
                                16,
                                16,
                                MediaQuery.viewPaddingOf(context).bottom + 16,
                              ),
                              child: Column(
                                children: [
                                  if (controller.loading)
                                    const _InlineState(
                                      icon: Icons.sync_rounded,
                                      text: 'Sincronizando dados...',
                                    ),
                                  if (controller.error != null) ...[
                                    _InlineState(
                                      icon: Icons.warning_amber_rounded,
                                      text: controller.error!,
                                      danger: true,
                                    ),
                                  ],
                                  Expanded(child: _content()),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _InlineState extends StatelessWidget {
  const _InlineState({
    required this.icon,
    required this.text,
    this.danger = false,
  });

  final IconData icon;
  final String text;
  final bool danger;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: danger ? AppColors.roseSoft : AppColors.goldSoft,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color:
                  danger ? const Color(0xFFFECACA) : const Color(0xFFFDE68A)),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 18, color: danger ? AppColors.rose : AppColors.goldDark),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                text,
                style: TextStyle(
                  color: danger ? AppColors.rose : AppColors.goldDark,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      );
}

class _Header extends StatelessWidget {
  const _Header({
    required this.section,
    required this.unread,
    required this.onNotifications,
    this.onMenu,
  });

  final AppSection section;
  final int unread;
  final VoidCallback onNotifications;
  final VoidCallback? onMenu;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: .97),
      child: SafeArea(
        bottom: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 13, 16, 13),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: AppColors.border)),
          ),
          child: Row(
            children: [
              const BrandLogo(compact: true, size: 44),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SALÃO PREMIUM',
                      style: TextStyle(
                        color: AppColors.goldDark,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2.0,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      section.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 27,
                        height: 1,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1.3,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      section.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _HeaderButton(
                icon: Icons.notifications_none_rounded,
                badge: unread,
                active: section == AppSection.notificacoes,
                onTap: onNotifications,
              ),
              if (onMenu != null) ...[
                const SizedBox(width: 7),
                _HeaderButton(icon: Icons.menu_rounded, onTap: onMenu!),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderButton extends StatelessWidget {
  const _HeaderButton({
    required this.icon,
    required this.onTap,
    this.badge = 0,
    this.active = false,
  });

  final IconData icon;
  final VoidCallback onTap;
  final int badge;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: active ? AppColors.ink : Colors.white,
          shape: const CircleBorder(side: BorderSide(color: AppColors.border)),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: SizedBox(
              width: 48,
              height: 48,
              child: Icon(
                icon,
                color: active ? AppColors.gold : AppColors.ink,
                size: 24,
              ),
            ),
          ),
        ),
        if (badge > 0)
          Positioned(
            right: -2,
            top: -3,
            child: Container(
              constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
              padding: const EdgeInsets.symmetric(horizontal: 5),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.gold,
                shape: BoxShape.circle,
                border: Border.all(
                  color: active ? AppColors.ink : Colors.white,
                  width: 2,
                ),
              ),
              child: Text(
                '$badge',
                style: const TextStyle(
                  color: Colors.black,
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _SideMenu extends StatelessWidget {
  const _SideMenu({
    required this.current,
    required this.unread,
    required this.professionalName,
    required this.onSelect,
    required this.onLogout,
    required this.showClose,
  });

  final AppSection current;
  final int unread;
  final String professionalName;
  final ValueChanged<AppSection> onSelect;
  final VoidCallback onLogout;
  final bool showClose;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ColoredBox(
        color: Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Expanded(child: BrandLogo()),
                  if (showClose)
                    IconButton.filledTonal(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded),
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(left: 57, top: 3),
                child: Text(
                  professionalName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 22),
              Expanded(
                child: ListView.separated(
                  itemCount: AppSection.values.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 4),
                  itemBuilder: (context, index) {
                    final item = AppSection.values[index];
                    final active = item == current;
                    return Material(
                      color: active ? AppColors.ink : Colors.transparent,
                      borderRadius: BorderRadius.circular(16),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => onSelect(item),
                        child: SizedBox(
                          height: 49,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            child: Row(
                              children: [
                                Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    Icon(
                                      item.icon,
                                      color: active
                                          ? Colors.white
                                          : const Color(0xFF3F3F46),
                                      size: 21,
                                    ),
                                    if (item == AppSection.notificacoes &&
                                        unread > 0)
                                      Positioned(
                                        right: -7,
                                        top: -7,
                                        child: Container(
                                          width: 18,
                                          height: 18,
                                          alignment: Alignment.center,
                                          decoration: BoxDecoration(
                                            color: AppColors.gold,
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: active
                                                  ? AppColors.ink
                                                  : Colors.white,
                                              width: 2,
                                            ),
                                          ),
                                          child: Text(
                                            '$unread',
                                            style: const TextStyle(
                                              fontSize: 8,
                                              fontWeight: FontWeight.w900,
                                              color: Colors.black,
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    item.label,
                                    style: TextStyle(
                                      color: active
                                          ? Colors.white
                                          : const Color(0xFF3F3F46),
                                      fontSize: 14,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                                if (item == AppSection.notificacoes &&
                                    unread > 0)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: active
                                          ? Colors.white.withValues(alpha: .12)
                                          : AppColors.goldSoft,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      '$unread',
                                      style: TextStyle(
                                        color: active
                                            ? Colors.white
                                            : AppColors.goldDark,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: onLogout,
                icon: const Icon(Icons.logout_rounded, size: 19),
                label: const Text('Sair'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.ink,
                  minimumSize: const Size.fromHeight(49),
                  side: const BorderSide(color: AppColors.border),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
