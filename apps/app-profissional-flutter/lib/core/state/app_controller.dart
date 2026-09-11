import 'package:flutter/foundation.dart';
import '../api/professional_api.dart';
import '../../data/api_models.dart';

class AppController extends ChangeNotifier {
  AppController(this.api);

  final ProfessionalApi api;

  ProfessionalProfile? profile;
  List<AppClientModel> clients = [];
  List<AppServiceModel> services = [];
  List<AppAppointmentModel> appointments = [];
  List<AppAppointmentModel> blocks = [];
  List<Map<String, dynamic>> professionals = [];
  List<AppCommandModel> commands = [];
  List<AppCommandItemModel> commandItems = [];
  List<AppCommissionModel> commissions = [];
  List<AppReviewModel> reviews = [];
  List<AppNotificationModel> notifications = [];
  List<AppCouponModel> coupons = [];

  bool initialized = false;
  bool loading = false;
  String? error;
  DateTime? lastSync;

  int get unreadCount => notifications.where((n) => !n.read).length;
  bool get isAuthenticated => profile != null && api.hasToken;

  Future<void> initialize() async {
    await api.initialize();
    if (!api.hasToken) {
      initialized = true;
      notifyListeners();
      return;
    }
    try {
      await restoreSession();
    } catch (_) {
      await api.clearLocalSession();
      profile = null;
    } finally {
      initialized = true;
      notifyListeners();
    }
  }

  Future<void> login(String cpf, String senha) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final payload = await api.login(cpf, senha);
      final raw = payload['profissional'];
      if (raw is Map) {
        profile = ProfessionalProfile.fromJson(raw.cast<String, dynamic>());
      }
      await restoreSession(refreshEverything: true);
    } on ApiException catch (e) {
      error = e.message;
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> restoreSession({bool refreshEverything = true}) async {
    final payload = await api.session();
    final raw = payload['profissional'];
    if (raw is! Map) throw ApiException('Perfil profissional indisponível.');
    profile = ProfessionalProfile.fromJson(raw.cast<String, dynamic>());
    if (refreshEverything) await refreshAll();
  }

  Future<void> logout() async {
    await api.logout();
    profile = null;
    clients = [];
    services = [];
    appointments = [];
    blocks = [];
    professionals = [];
    commands = [];
    commandItems = [];
    commissions = [];
    reviews = [];
    notifications = [];
    coupons = [];
    error = null;
    notifyListeners();
  }

  String _date(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  ({String start, String end}) _wideRange() {
    final now = DateTime.now();
    return (
      start: _date(DateTime(now.year, now.month - 6, 1)),
      end: _date(DateTime(now.year, now.month + 4, 0))
    );
  }

  Future<void> refreshAll() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final range = _wideRange();
      final results = await Future.wait([
        api.loadData(range.start, range.end),
        api.loadComandas(range.start, range.end),
        api.loadComissoes(range.start, range.end),
        api.loadAvaliacoes(range.start, range.end),
        api.loadCupons().catchError(
            (_) => <String, dynamic>{'ok': true, 'cupons': <dynamic>[]}),
      ]);
      _applyData(results[0]);
      _applyCommands(results[1]);
      _applyCommissions(results[2]);
      _applyReviews(results[3]);
      _applyCoupons(results[4]);
      lastSync = DateTime.now();
    } on ApiException catch (e) {
      error = e.message;
      if (e.statusCode == 401) {
        await api.clearLocalSession();
        profile = null;
      }
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> refreshData() async {
    final range = _wideRange();
    _applyData(await api.loadData(range.start, range.end));
    lastSync = DateTime.now();
    notifyListeners();
  }

  Future<void> refreshCommands() async {
    final range = _wideRange();
    _applyCommands(await api.loadComandas(range.start, range.end));
    notifyListeners();
  }

  Future<void> refreshCommissions() async {
    final range = _wideRange();
    _applyCommissions(await api.loadComissoes(range.start, range.end));
    notifyListeners();
  }

  Future<void> refreshReviews() async {
    final range = _wideRange();
    _applyReviews(await api.loadAvaliacoes(range.start, range.end));
    notifyListeners();
  }

  Future<void> refreshCoupons() async {
    _applyCoupons(await api.loadCupons());
    notifyListeners();
  }

  void _applyData(Map<String, dynamic> payload) {
    clients = _maps(payload['clientes']).map(AppClientModel.fromJson).toList();
    services =
        _maps(payload['servicos']).map(AppServiceModel.fromJson).toList();
    appointments = _maps(payload['agendamentos'])
        .map(AppAppointmentModel.fromJson)
        .toList();
    blocks =
        _maps(payload['bloqueios']).map(AppAppointmentModel.fromJson).toList();
    professionals = _maps(payload['profissionais']);
    notifications = _maps(payload['notificacoes'])
        .map(AppNotificationModel.fromJson)
        .toList();
  }

  void _applyCommands(Map<String, dynamic> payload) {
    commands =
        _maps(payload['comandas']).map(AppCommandModel.fromJson).toList();
    commandItems = _maps(payload['itensComanda'])
        .map(AppCommandItemModel.fromJson)
        .toList();
  }

  void _applyCommissions(Map<String, dynamic> payload) {
    commissions =
        _maps(payload['comissoes']).map(AppCommissionModel.fromJson).toList();
  }

  void _applyReviews(Map<String, dynamic> payload) {
    reviews =
        _maps(payload['avaliacoes']).map(AppReviewModel.fromJson).toList();
  }

  void _applyCoupons(Map<String, dynamic> payload) {
    coupons = _maps(payload['cupons']).map(AppCouponModel.fromJson).toList();
  }

  List<Map<String, dynamic>> _maps(dynamic value) => value is List
      ? value.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList()
      : <Map<String, dynamic>>[];

  Future<void> confirmAppointment(String id) async {
    await api.agendaAction('confirmar', id);
    await refreshData();
  }

  Future<void> confirmPix(String id) async {
    await api.agendaAction('confirmar_pix', id);
    await refreshData();
  }

  Future<void> cancelAppointment(String id) async {
    await api.agendaAction('remover', id);
    await refreshData();
  }

  Future<void> rescheduleAppointment(
      {required String id,
      required String date,
      required String start,
      required String end}) async {
    await api.agendaAction(
        'reagendar', id, {'data': date, 'horaInicio': start, 'horaFim': end});
    await refreshData();
  }

  Future<void> blockTime(
      {required List<String> dates,
      required String start,
      required String end,
      required String reason,
      String? professionalId}) async {
    await api.bloquearHorario(
        datas: dates,
        horaInicio: start,
        horaFim: end,
        motivo: reason,
        profissionalId: professionalId);
    await refreshData();
  }

  Future<void> createAppointment(
      {required String clientId,
      required String serviceId,
      required String date,
      required String start,
      String? professionalId}) async {
    await api.mutation('criar_agendamento', {
      'clienteId': clientId,
      'servicoId': serviceId,
      'data': date,
      'horaInicio': start,
      if (professionalId != null && professionalId.isNotEmpty)
        'profissionalId': professionalId,
    });
    try {
      await api.auditarAgendamento(
          clienteId: clientId,
          servicoId: serviceId,
          data: date,
          horaInicio: start,
          profissionalId: professionalId);
    } catch (_) {}
    await refreshData();
  }

  Future<void> createClient(
      {required String name,
      required String phone,
      required String notes}) async {
    await api.mutation('criar_cliente',
        {'nome': name, 'telefone': phone, 'observacoes': notes});
    await refreshData();
  }

  Future<void> editClient(
      {required String id,
      required String name,
      required String phone,
      required String notes}) async {
    await api.mutation('editar_cliente', {
      'clienteId': id,
      'nome': name,
      'telefone': phone,
      'observacoes': notes
    });
    await refreshData();
  }

  Future<void> createService(
      {required String name,
      required double price,
      required int duration,
      required String description}) async {
    await api.mutation('criar_servico', {
      'nome': name,
      'preco': price,
      'duracaoMinutos': duration,
      'descricao': description
    });
    await refreshData();
  }

  Future<void> editService(
      {required String id,
      required String name,
      required double price,
      required int duration,
      required String description}) async {
    await api.mutation('editar_servico', {
      'servicoId': id,
      'nome': name,
      'preco': price,
      'duracaoMinutos': duration,
      'descricao': description
    });
    await refreshData();
  }

  Future<void> changePassword(
      String currentPassword, String newPassword) async {
    final result = await api.mutation(
        'trocar_senha', {'senhaAtual': currentPassword, 'senha': newPassword});
    if (result['reauthenticate'] == true) {
      await api.clearLocalSession();
      profile = null;
      notifyListeners();
    }
  }

  Future<void> deleteReview(String id) async {
    await api.mutation('excluir_avaliacao', {'avaliacaoId': id});
    await refreshReviews();
  }

  Future<void> openCommand(
      {String? clientId, required String clientName}) async {
    await api.mutation(
        'abrir_comanda', {'clienteId': clientId, 'clienteNome': clientName});
    await refreshCommands();
  }

  Future<void> addCommandItem(
      {required String commandId,
      String? serviceId,
      required String name,
      required double quantity,
      required double unitPrice,
      String type = 'servico'}) async {
    await api.mutation('adicionar_item_comanda', {
      'comandaId': commandId,
      'servicoId': serviceId,
      'nome': name,
      'quantidade': quantity,
      'valorUnitario': unitPrice,
      'tipo': type,
    });
    await refreshCommands();
  }

  Future<void> closeCommand(String commandId) async {
    await api.mutation('fechar_comanda', {'comandaId': commandId});
    await Future.wait([refreshCommands(), refreshCommissions()]);
  }

  Future<List<CouponRecipient>> createCoupon(
      {required String name,
      required String description,
      required String discountType,
      required double discountValue,
      required String validUntil,
      required int totalLimit,
      required List<String> clientIds}) async {
    final payload = await api.createCoupon({
      'nome': name,
      'descricao': description,
      'tipoDesconto': discountType,
      'valorDesconto': discountValue,
      'validoAte': validUntil,
      'limiteTotal': totalLimit,
      'clienteIds': clientIds,
    });
    await refreshCoupons();
    return _maps(payload['destinatarios'])
        .map(CouponRecipient.fromJson)
        .toList();
  }

  Future<void> toggleCoupon(String id, bool active) async {
    await api.updateCoupon(id, active);
    await refreshCoupons();
  }

  Future<void> deleteCoupon(String id) async {
    await api.deleteCoupon(id);
    await refreshCoupons();
  }

  Future<void> markNotificationRead(String id) async {
    await api.markNotificationRead(id);
    notifications = notifications
        .map((n) => n.id == id
            ? AppNotificationModel(
                id: n.id,
                title: n.title,
                message: n.message,
                read: true,
                createdAt: n.createdAt,
                url: n.url,
                type: n.type,
                status: n.status)
            : n)
        .toList();
    notifyListeners();
  }

  Future<void> markAllNotificationsRead() async {
    final pending = notifications.where((n) => !n.read).toList();
    for (final notification in pending) {
      await api.markNotificationRead(notification.id);
    }
    await refreshData();
  }

  Future<void> saveSettings(
      {required String name,
      required String phone,
      required int interval,
      required List<Map<String, dynamic>> workDays}) async {
    await api.saveSettings({
      'nome': name,
      'telefone': phone,
      'intervalo': interval,
      'diasTrabalho': workDays
    });
    await restoreSession(refreshEverything: false);
    notifyListeners();
  }

  @override
  void dispose() {
    api.close();
    super.dispose();
  }
}
