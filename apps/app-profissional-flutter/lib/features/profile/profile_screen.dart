import 'package:flutter/material.dart';
import '../../core/api/professional_api.dart';
import '../../core/navigation/app_section.dart';
import '../../core/state/app_scope.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.onNavigate});
  final ValueChanged<AppSection> onNavigate;
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _busy = false;
  Future<void> _changePassword() async {
    final current = TextEditingController();
    final pass = TextEditingController();
    final confirm = TextEditingController();
    String? error;
    final ok = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        builder: (ctx) => StatefulBuilder(
            builder: (context, setModal) => Padding(
                padding: EdgeInsets.fromLTRB(
                    20, 18, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
                child: SafeArea(
                    top: false,
                    child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Trocar senha',
                              style: TextStyle(
                                  fontSize: 25, fontWeight: FontWeight.w900)),
                          const SizedBox(height: 16),
                          TextField(
                              controller: current,
                              obscureText: true,
                              decoration: const InputDecoration(
                                  labelText: 'Senha atual')),
                          const SizedBox(height: 10),
                          TextField(
                              controller: pass,
                              obscureText: true,
                              decoration: const InputDecoration(
                                  labelText: 'Nova senha')),
                          const SizedBox(height: 10),
                          TextField(
                              controller: confirm,
                              obscureText: true,
                              decoration: const InputDecoration(
                                  labelText: 'Confirmar nova senha')),
                          if (error != null) ...[
                            const SizedBox(height: 9),
                            Text(error!,
                                style: const TextStyle(
                                    color: Colors.red,
                                    fontWeight: FontWeight.w800))
                          ],
                          const SizedBox(height: 16),
                          FilledButton(
                              onPressed: () {
                                if (current.text.isEmpty) {
                                  setModal(
                                      () => error = 'Informe sua senha atual.');
                                  return;
                                }
                                if (pass.text.length < 6) {
                                  setModal(() => error =
                                      'A nova senha precisa ter pelo menos 6 caracteres.');
                                  return;
                                }
                                if (pass.text != confirm.text) {
                                  setModal(
                                      () => error = 'As senhas não conferem.');
                                  return;
                                }
                                Navigator.pop(ctx, true);
                              },
                              child: const Text('Salvar nova senha'))
                        ])))));
    if (ok == true && mounted) {
      setState(() => _busy = true);
      try {
        await AppScope.of(context).changePassword(current.text, pass.text);
        if (mounted) {
          showAppSuccess(
              context, 'Senha alterada. Entre novamente com sua nova senha.');
        }
      } on ApiException catch (e) {
        if (mounted) showAppError(context, e.message);
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    }
    current.dispose();
    pass.dispose();
    confirm.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = AppScope.of(context).profile;
    if (p == null) return const Center(child: CircularProgressIndicator());
    return ListView(padding: const EdgeInsets.only(bottom: 30), children: [
      Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(22)),
          child: Row(children: [
            Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                    color: AppColors.goldSoft,
                    borderRadius: BorderRadius.circular(18)),
                child: const Icon(Icons.person_rounded,
                    color: AppColors.goldDark, size: 31)),
            const SizedBox(width: 14),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  const Text('MEU PERFIL',
                      style: TextStyle(
                          color: AppColors.goldDark,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.6)),
                  const SizedBox(height: 4),
                  Text(p.name,
                      style: const TextStyle(
                          fontSize: 23, fontWeight: FontWeight.w900)),
                  Text(
                      p.role.isNotEmpty
                          ? p.role
                          : (p.category.isNotEmpty
                              ? p.category
                              : 'Profissional'),
                      style: const TextStyle(
                          color: AppColors.muted, fontWeight: FontWeight.w700))
                ])),
            IconButton.filledTonal(
                onPressed: () => widget.onNavigate(AppSection.configuracoes),
                icon: const Icon(Icons.edit_rounded))
          ])),
      const SizedBox(height: 12),
      _Section(
          'Informações',
          Column(children: [
            _Info(
                Icons.phone_rounded,
                'TELEFONE / WHATSAPP',
                p.whatsapp.isNotEmpty
                    ? p.whatsapp
                    : (p.phone.isNotEmpty ? p.phone : 'Não informado')),
            _Info(Icons.mail_outline_rounded, 'E-MAIL',
                p.email.isEmpty ? 'Não informado' : p.email),
            _Info(Icons.shield_outlined, 'CPF', p.cpf.isEmpty ? '—' : p.cpf),
            _Info(Icons.schedule_rounded, 'INTERVALO DA AGENDA',
                '${p.intervalMinutes} minutos'),
            _Info(Icons.badge_outlined, 'NÍVEL DE ACESSO',
                p.accessLevel.isEmpty ? 'Profissional' : p.accessLevel)
          ])),
      const SizedBox(height: 12),
      Material(
          color: AppColors.goldSoft,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: () => widget.onNavigate(AppSection.configuracoes),
              child: const Padding(
                  padding: EdgeInsets.all(15),
                  child: Row(children: [
                    Icon(Icons.schedule_rounded, color: AppColors.goldDark),
                    SizedBox(width: 10),
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text('Editar perfil e horários',
                              style: TextStyle(fontWeight: FontWeight.w900)),
                          Text('Dados, expediente e intervalo da agenda',
                              style: TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700))
                        ])),
                    Icon(Icons.chevron_right_rounded)
                  ])))),
      const SizedBox(height: 12),
      _Section(
          'Segurança',
          SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                  onPressed: _busy ? null : _changePassword,
                  icon: const Icon(Icons.key_rounded),
                  label: const Text('Trocar senha'),
                  style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50))))),
      const SizedBox(height: 10),
      OutlinedButton.icon(
          onPressed: () => widget.onNavigate(AppSection.suporte),
          icon: const Icon(Icons.support_agent_rounded),
          label: const Text('Abrir suporte'),
          style:
              OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50)))
    ]);
  }
}

class _Section extends StatelessWidget {
  const _Section(this.title, this.child);
  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
        const SizedBox(height: 11),
        child
      ]));
}

class _Info extends StatelessWidget {
  const _Info(this.icon, this.label, this.value);
  final IconData icon;
  final String label, value;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(children: [
        Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
                color: const Color(0xFFFAFAFA),
                borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: AppColors.muted, size: 20)),
        const SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 8,
                  fontWeight: FontWeight.w900,
                  letterSpacing: .9)),
          Text(value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900))
        ]))
      ]));
}
