import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../core/state/app_scope.dart';
import '../../core/api/professional_api.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin});

  final VoidCallback onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _cpfController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _cpfController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_cpfController.text.trim().isEmpty ||
        _passwordController.text.isEmpty) {
      setState(() => _error = 'Informe seu CPF e sua senha.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await AppScope.of(context)
          .login(_cpfController.text, _passwordController.text);
      if (!mounted) return;
      widget.onLogin();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error =
          'Não foi possível entrar. Verifique sua internet e tente novamente.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ink,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 30),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 390),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: Image.asset(
                          'assets/images/brand-logo.png',
                          width: 64,
                          height: 64,
                        ),
                      ),
                      const SizedBox(width: 13),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'SALÃO PREMIUM',
                            style: TextStyle(
                              color: Color(0xFFF8D891),
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2.2,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Profissional',
                            style: TextStyle(
                              color: Color(0xFFA1A1AA),
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 34),
                  const Text(
                    'App\nprofissional',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 48,
                      height: .93,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -3.0,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Entre com CPF e senha para abrir sua agenda, comandas e clientes.',
                    style: TextStyle(
                      color: Color(0xFFD4D4D8),
                      fontSize: 16,
                      height: 1.55,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 30),
                  const _FieldLabel('CPF'),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _cpfController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      CpfInputFormatter()
                    ],
                    style: const TextStyle(
                        color: AppColors.ink, fontWeight: FontWeight.w800),
                    decoration: const InputDecoration(
                      hintText: '000.000.000-00',
                      prefixIcon: Icon(Icons.person_outline_rounded,
                          color: Color(0xFF71717A)),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const _FieldLabel('SENHA'),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    onSubmitted: (_) => _submit(),
                    style: const TextStyle(
                        color: AppColors.ink, fontWeight: FontWeight.w800),
                    decoration: const InputDecoration(
                      hintText: 'Sua senha',
                      prefixIcon:
                          Icon(Icons.key_rounded, color: Color(0xFF71717A)),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF7F1D1D).withValues(alpha: .35),
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(
                            color:
                                const Color(0xFFF87171).withValues(alpha: .35)),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(
                            color: Color(0xFFFEE2E2),
                            fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                  const SizedBox(height: 22),
                  SizedBox(
                    height: 52,
                    child: FilledButton(
                      onPressed: _loading ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.gold,
                        foregroundColor: AppColors.ink,
                        disabledBackgroundColor:
                            AppColors.gold.withValues(alpha: .65),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2.3, color: AppColors.ink),
                            )
                          : const Text('Entrar',
                              style: TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w900)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFFE4E4E7),
        fontSize: 11,
        fontWeight: FontWeight.w900,
        letterSpacing: 1.4,
      ),
    );
  }
}

class CpfInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final clipped = digits.length > 11 ? digits.substring(0, 11) : digits;
    final buffer = StringBuffer();
    for (var i = 0; i < clipped.length; i++) {
      if (i == 3 || i == 6) buffer.write('.');
      if (i == 9) buffer.write('-');
      buffer.write(clipped[i]);
    }
    final text = buffer.toString();
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}
