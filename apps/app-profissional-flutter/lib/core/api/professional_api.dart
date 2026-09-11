import 'dart:async';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

class ProfessionalApi {
  ProfessionalApi({
    http.Client? client,
    FlutterSecureStorage? storage,
    this.origin = 'https://app.salaopremiun.com.br',
  })  : _client = client ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage();

  static const nativeAppId = 'br.com.salaopremiun.profissional';
  static const _tokenKey = 'salaopremiun.profissional.session.v1';

  final String origin;
  final http.Client _client;
  final FlutterSecureStorage _storage;
  String _token = '';

  Future<void> initialize() async {
    _token = (await _storage.read(key: _tokenKey) ?? '').trim();
  }

  bool get hasToken => _token.isNotEmpty;

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Uri.parse('$origin$path');
    return query == null ? base : base.replace(queryParameters: query);
  }

  Map<String, String> _headers({bool json = false}) {
    final headers = <String, String>{
      'Accept': 'application/json',
      'X-SP-Native-App': nativeAppId,
    };
    if (json) headers['Content-Type'] = 'application/json';
    if (_token.isNotEmpty) headers['Authorization'] = 'Bearer $_token';
    return headers;
  }

  Map<String, dynamic> _decode(http.Response response) {
    Map<String, dynamic> payload = <String, dynamic>{};
    if (response.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        if (decoded is Map<String, dynamic>) payload = decoded;
        if (decoded is Map) payload = decoded.cast<String, dynamic>();
      } catch (_) {
        payload = <String, dynamic>{};
      }
    }
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        payload['ok'] == false) {
      final message = (payload['error'] ??
              payload['message'] ??
              'Não foi possível concluir a operação.')
          .toString();
      throw ApiException(message, statusCode: response.statusCode);
    }
    return payload;
  }

  Future<http.Response> _safeRequest(Future<http.Response> request) async {
    try {
      return await request.timeout(const Duration(seconds: 25));
    } on TimeoutException {
      throw ApiException('O servidor demorou para responder. Tente novamente.');
    } on http.ClientException {
      throw ApiException(
          'Não foi possível conectar ao servidor. Verifique sua internet.');
    } catch (error) {
      if (error is ApiException) rethrow;
      throw ApiException('Falha de conexão com o servidor. Tente novamente.');
    }
  }

  Future<Map<String, dynamic>> get(String path,
      {Map<String, String>? query}) async {
    final response = await _safeRequest(
      _client.get(_uri(path, query), headers: _headers()),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> send(String path,
      {String method = 'POST', Map<String, dynamic>? body}) async {
    final uri = _uri(path);
    final encoded = jsonEncode(body ?? <String, dynamic>{});
    late http.Response response;
    switch (method.toUpperCase()) {
      case 'PATCH':
        response = await _safeRequest(
            _client.patch(uri, headers: _headers(json: true), body: encoded));
        break;
      case 'DELETE':
        response = await _safeRequest(
            _client.delete(uri, headers: _headers(json: true), body: encoded));
        break;
      default:
        response = await _safeRequest(
            _client.post(uri, headers: _headers(json: true), body: encoded));
    }
    return _decode(response);
  }

  Future<Map<String, dynamic>> login(String cpf, String senha) async {
    final response = await _safeRequest(
      _client.post(
        _uri('/api/app-profissional/auth/login'),
        headers: _headers(json: true),
        body: jsonEncode(
            {'cpf': cpf.replaceAll(RegExp(r'\D'), ''), 'senha': senha}),
      ),
    );
    final payload = _decode(response);
    final token = (payload['nativeAccessToken'] ?? '').toString().trim();
    if (token.isEmpty) {
      throw ApiException(
          'O servidor não devolveu a sessão nativa do aplicativo.');
    }
    _token = token;
    await _storage.write(key: _tokenKey, value: token);
    return payload;
  }

  Future<Map<String, dynamic>> session() =>
      get('/api/app-profissional/auth/session');

  Future<void> logout() async {
    try {
      if (_token.isNotEmpty) await send('/api/app-profissional/auth/logout');
    } catch (_) {
      // Logout local deve funcionar mesmo se o servidor estiver offline.
    } finally {
      _token = '';
      await _storage.delete(key: _tokenKey);
    }
  }

  Future<void> clearLocalSession() async {
    _token = '';
    await _storage.delete(key: _tokenKey);
  }

  Future<Map<String, dynamic>> loadData(String start, String end) =>
      get('/api/app-profissional/data', query: {'start': start, 'end': end});

  Future<Map<String, dynamic>> loadComandas(String start, String end) =>
      get('/api/app-profissional/comandas',
          query: {'start': start, 'end': end});

  Future<Map<String, dynamic>> loadComissoes(String start, String end) =>
      get('/api/app-profissional/comissoes',
          query: {'start': start, 'end': end});

  Future<Map<String, dynamic>> loadAvaliacoes(String start, String end) =>
      get('/api/app-profissional/avaliacoes',
          query: {'start': start, 'end': end});

  Future<Map<String, dynamic>> loadCupons() =>
      get('/api/app-profissional/cupons');

  Future<Map<String, dynamic>> mutation(String action,
          [Map<String, dynamic>? fields]) =>
      send('/api/app-profissional/mutacoes',
          body: {'action': action, ...?fields});

  Future<Map<String, dynamic>> agendaAction(String action, String agendamentoId,
          [Map<String, dynamic>? fields]) =>
      send('/api/app-profissional/agenda/acao',
          body: {'action': action, 'agendamentoId': agendamentoId, ...?fields});

  Future<Map<String, dynamic>> bloquearHorario({
    required List<String> datas,
    required String horaInicio,
    required String horaFim,
    required String motivo,
    String? profissionalId,
  }) =>
      send('/api/app-profissional/agenda/bloquear', body: {
        'datas': datas,
        'horaInicio': horaInicio,
        'horaFim': horaFim,
        'motivo': motivo,
        if (profissionalId != null && profissionalId.isNotEmpty)
          'profissionalId': profissionalId,
      });

  Future<Map<String, dynamic>> auditarAgendamento({
    required String clienteId,
    required String servicoId,
    required String data,
    required String horaInicio,
    String? profissionalId,
  }) =>
      send('/api/app-profissional/agenda/auditoria-criacao', body: {
        'clienteId': clienteId,
        'servicoId': servicoId,
        'data': data,
        'horaInicio': horaInicio,
        if (profissionalId != null && profissionalId.isNotEmpty)
          'profissionalId': profissionalId,
      });

  Future<Map<String, dynamic>> saveSettings(Map<String, dynamic> body) =>
      send('/api/app-profissional/configuracoes', body: body);

  Future<Map<String, dynamic>> createCoupon(Map<String, dynamic> body) =>
      send('/api/app-profissional/cupons', body: body);

  Future<Map<String, dynamic>> updateCoupon(String id, bool ativo) =>
      send('/api/app-profissional/cupons',
          method: 'PATCH', body: {'id': id, 'ativo': ativo});

  Future<Map<String, dynamic>> deleteCoupon(String id) =>
      send('/api/app-profissional/cupons', method: 'DELETE', body: {'id': id});

  Future<Map<String, dynamic>> markNotificationRead(String id) =>
      send('/api/app-profissional/notificacoes/read', body: {'id': id});

  void close() => _client.close();
}
