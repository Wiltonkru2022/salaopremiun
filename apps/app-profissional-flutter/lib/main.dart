import 'package:flutter/material.dart';
import 'core/api/professional_api.dart';
import 'core/permissions/app_permissions.dart';
import 'core/state/app_controller.dart';
import 'core/state/app_scope.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/shell/professional_shell.dart';
import 'features/splash/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SalaoPremiumProfissionalApp());
}

enum _AppStage { splash, login, app }

class SalaoPremiumProfissionalApp extends StatefulWidget {
  const SalaoPremiumProfissionalApp({super.key});

  @override
  State<SalaoPremiumProfissionalApp> createState() =>
      _SalaoPremiumProfissionalAppState();
}

class _SalaoPremiumProfissionalAppState
    extends State<SalaoPremiumProfissionalApp> {
  late final AppController _controller;
  _AppStage _stage = _AppStage.splash;
  bool _bootFinished = false;
  bool _splashFinished = false;

  @override
  void initState() {
    super.initState();
    _controller = AppController(ProfessionalApi());
    _controller.addListener(_handleControllerState);
    _boot();
  }

  Future<void> _boot() async {
    await AppPermissions.requestStartupPermissions();
    await _controller.initialize();
    if (!mounted) return;
    setState(() => _bootFinished = true);
    _tryLeaveSplash();
  }

  void _handleControllerState() {
    if (!mounted || _stage != _AppStage.app) return;
    if (!_controller.isAuthenticated) {
      setState(() => _stage = _AppStage.login);
    }
  }

  void _tryLeaveSplash() {
    if (!_bootFinished || !_splashFinished || !mounted) return;
    setState(() {
      _stage = _controller.isAuthenticated ? _AppStage.app : _AppStage.login;
    });
  }

  Future<void> _logout() async {
    await _controller.logout();
    if (mounted) setState(() => _stage = _AppStage.login);
  }

  @override
  void dispose() {
    _controller.removeListener(_handleControllerState);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      controller: _controller,
      child: MaterialApp(
        title: 'Salão Premium Profissional',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        home: AnimatedSwitcher(
          duration: const Duration(milliseconds: 260),
          child: switch (_stage) {
            _AppStage.splash => SplashScreen(
                key: const ValueKey('splash'),
                onFinished: () {
                  _splashFinished = true;
                  _tryLeaveSplash();
                },
              ),
            _AppStage.login => LoginScreen(
                key: const ValueKey('login'),
                onLogin: () => setState(() => _stage = _AppStage.app),
              ),
            _AppStage.app => ProfessionalShell(
                key: const ValueKey('app'),
                onLogout: _logout,
              ),
          },
        ),
      ),
    );
  }
}
