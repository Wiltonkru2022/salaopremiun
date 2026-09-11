String textOf(dynamic value, [String fallback = '']) =>
    value == null ? fallback : value.toString();
double doubleOf(dynamic value) => value is num
    ? value.toDouble()
    : double.tryParse(textOf(value).replaceAll(',', '.')) ?? 0;
int intOf(dynamic value) =>
    value is num ? value.toInt() : int.tryParse(textOf(value)) ?? 0;
bool boolOf(dynamic value) =>
    value == true || textOf(value).toLowerCase() == 'true';

DateTime? dateOf(dynamic value) {
  final raw = textOf(value).trim();
  if (raw.isEmpty) return null;
  return DateTime.tryParse(raw);
}

class ProfessionalProfile {
  ProfessionalProfile({
    required this.id,
    required this.salonId,
    required this.name,
    required this.cpf,
    required this.accessLevel,
    required this.canSeeAllAgenda,
    this.phone = '',
    this.whatsapp = '',
    this.email = '',
    this.role = '',
    this.category = '',
    this.bio = '',
    this.intervalMinutes = 30,
    this.workDays = const [],
  });

  final String id;
  final String salonId;
  final String name;
  final String cpf;
  final String accessLevel;
  final bool canSeeAllAgenda;
  final String phone;
  final String whatsapp;
  final String email;
  final String role;
  final String category;
  final String bio;
  final int intervalMinutes;
  final List<Map<String, dynamic>> workDays;

  factory ProfessionalProfile.fromJson(Map<String, dynamic> json) {
    final work = json['dias_trabalho'] ?? json['horario_funcionamento'];
    return ProfessionalProfile(
      id: textOf(json['id']),
      salonId: textOf(json['id_salao']),
      name: textOf(json['nome'], 'Profissional'),
      cpf: textOf(json['cpf']),
      accessLevel: textOf(json['nivel_acesso']),
      canSeeAllAgenda:
          boolOf(json['podeVerAgendaTodos'] ?? json['pode_ver_agenda_todos']),
      phone: textOf(json['telefone']),
      whatsapp: textOf(json['whatsapp']),
      email: textOf(json['email']),
      role: textOf(json['cargo']),
      category: textOf(json['categoria']),
      bio: textOf(json['bio']),
      intervalMinutes: intOf(json['intervalo_agenda_minutos']) > 0
          ? intOf(json['intervalo_agenda_minutos'])
          : 30,
      workDays: work is List
          ? work.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList()
          : const [],
    );
  }
}

class AppClientModel {
  AppClientModel(
      {required this.id,
      required this.name,
      this.phone = '',
      this.whatsapp = '',
      this.notes = '',
      this.createdAt});
  final String id;
  final String name;
  final String phone;
  final String whatsapp;
  final String notes;
  final DateTime? createdAt;

  factory AppClientModel.fromJson(Map<String, dynamic> json) => AppClientModel(
        id: textOf(json['id']),
        name: textOf(json['nome'], 'Cliente'),
        phone: textOf(json['telefone']),
        whatsapp: textOf(json['whatsapp']),
        notes: textOf(json['observacoes']),
        createdAt: dateOf(json['created_at']),
      );

  String get bestPhone => whatsapp.isNotEmpty ? whatsapp : phone;
}

class AppServiceModel {
  AppServiceModel(
      {required this.id,
      required this.professionalId,
      required this.name,
      required this.price,
      required this.durationMinutes,
      this.description = ''});
  final String id;
  final String professionalId;
  final String name;
  final double price;
  final int durationMinutes;
  final String description;

  factory AppServiceModel.fromJson(Map<String, dynamic> json) =>
      AppServiceModel(
        id: textOf(json['id']),
        professionalId: textOf(json['profissional_id']),
        name: textOf(json['nome'], 'Serviço'),
        price: doubleOf(json['preco']),
        durationMinutes: intOf(json['duracao_minutos']) > 0
            ? intOf(json['duracao_minutos'])
            : 30,
        description: textOf(json['descricao']),
      );
}

class AppAppointmentModel {
  AppAppointmentModel({
    required this.id,
    required this.professionalId,
    required this.date,
    required this.start,
    required this.end,
    required this.status,
    this.clientId = '',
    this.serviceId = '',
    this.clientName = 'Cliente',
    this.serviceName = 'Serviço',
    this.professionalName = 'Profissional',
    this.notes = '',
    this.origin = '',
    this.signalStatus = '',
    this.signalConfirmationOwner = '',
    this.createdByName = '',
    this.createdAt = '',
    this.customerConfirmationStatus = '',
    this.customerConfirmedAt = '',
    this.commandId = '',
    this.signalProofPath = '',
    this.signalProofName = '',
    this.signalValue = 0,
    this.price = 0,
  });

  final String id;
  final String professionalId;
  final String clientId;
  final String serviceId;
  final DateTime date;
  final String start;
  final String end;
  final String status;
  final String clientName;
  final String serviceName;
  final String professionalName;
  final String notes;
  final String origin;
  final String signalStatus;
  final String signalConfirmationOwner;
  final String createdByName;
  final String createdAt;
  final String customerConfirmationStatus;
  final String customerConfirmedAt;
  final String commandId;
  final String signalProofPath;
  final String signalProofName;
  final double signalValue;
  final double price;

  factory AppAppointmentModel.fromJson(Map<String, dynamic> json) {
    final client = json['clientes'] is Map
        ? (json['clientes'] as Map).cast<String, dynamic>()
        : <String, dynamic>{};
    final service = json['servicos'] is Map
        ? (json['servicos'] as Map).cast<String, dynamic>()
        : <String, dynamic>{};
    return AppAppointmentModel(
      id: textOf(json['id']),
      professionalId: textOf(json['profissional_id']),
      clientId: textOf(json['cliente_id']),
      serviceId: textOf(json['servico_id']),
      date: DateTime.tryParse(textOf(json['data'])) ?? DateTime.now(),
      start: textOf(json['hora_inicio']).substring(
          0,
          textOf(json['hora_inicio']).length >= 5
              ? 5
              : textOf(json['hora_inicio']).length),
      end: textOf(json['hora_fim']).substring(
          0,
          textOf(json['hora_fim']).length >= 5
              ? 5
              : textOf(json['hora_fim']).length),
      status: textOf(json['status'], 'pendente'),
      clientName: textOf(
          client['nome'],
          json['status'] == 'bloqueado'
              ? textOf(json['titulo'], 'Bloqueado')
              : 'Cliente'),
      serviceName: textOf(service['nome'],
          json['status'] == 'bloqueado' ? 'Horário bloqueado' : 'Serviço'),
      professionalName: textOf(json['profissional_nome'], 'Profissional'),
      notes: textOf(json['observacoes']),
      origin: textOf(json['origem']),
      signalStatus: textOf(json['sinal_status']),
      signalConfirmationOwner: textOf(json['sinal_confirmacao_responsavel']),
      createdByName:
          textOf(json['agendado_por_nome'], textOf(json['criado_por_nome'])),
      createdAt: textOf(json['agendado_em'], textOf(json['created_at'])),
      customerConfirmationStatus: textOf(json['cliente_confirmacao_status']),
      customerConfirmedAt: textOf(json['cliente_confirmou_em']),
      commandId: textOf(json['id_comanda'], textOf(json['comanda_id'])),
      signalProofPath: textOf(json['sinal_comprovante_path']),
      signalProofName: textOf(json['sinal_comprovante_nome']),
      signalValue: doubleOf(json['sinal_valor']),
      price: doubleOf(service['preco']),
    );
  }

  bool get isBlocked => status.toLowerCase() == 'bloqueado';
}

class AppCommandModel {
  AppCommandModel(
      {required this.id,
      required this.number,
      required this.clientName,
      required this.status,
      required this.total,
      this.clientId = '',
      this.subtotal = 0,
      this.discount = 0,
      this.openedAt,
      this.closedAt});
  final String id;
  final int number;
  final String clientId;
  final String clientName;
  final String status;
  final double subtotal;
  final double discount;
  final double total;
  final DateTime? openedAt;
  final DateTime? closedAt;

  factory AppCommandModel.fromJson(Map<String, dynamic> json) =>
      AppCommandModel(
        id: textOf(json['id']),
        number: intOf(json['numero']),
        clientId: textOf(json['cliente_id']),
        clientName: textOf(json['cliente_nome'], 'Consumidor Final'),
        status: textOf(json['status'], 'aberta'),
        subtotal: doubleOf(json['subtotal']),
        discount: doubleOf(json['desconto']),
        total: doubleOf(json['total']),
        openedAt: dateOf(json['aberta_em']),
        closedAt: dateOf(json['fechada_em']),
      );
}

class AppCommandItemModel {
  AppCommandItemModel(
      {required this.id,
      required this.commandId,
      required this.name,
      required this.type,
      required this.quantity,
      required this.unitPrice,
      required this.total,
      this.serviceId = ''});
  final String id;
  final String commandId;
  final String serviceId;
  final String name;
  final String type;
  final double quantity;
  final double unitPrice;
  final double total;

  factory AppCommandItemModel.fromJson(Map<String, dynamic> json) =>
      AppCommandItemModel(
        id: textOf(json['id']),
        commandId: textOf(json['comanda_id']),
        serviceId: textOf(json['servico_id']),
        name: textOf(json['nome'], 'Item'),
        type: textOf(json['tipo'], 'servico'),
        quantity: doubleOf(json['quantidade']),
        unitPrice: doubleOf(json['valor_unitario']),
        total: doubleOf(json['total']),
      );
}

class AppCommissionModel {
  AppCommissionModel(
      {required this.id,
      required this.description,
      required this.value,
      required this.baseValue,
      required this.percent,
      required this.status,
      this.competenceDate,
      this.paidAt});
  final String id;
  final String description;
  final double value;
  final double baseValue;
  final double percent;
  final String status;
  final DateTime? competenceDate;
  final DateTime? paidAt;

  factory AppCommissionModel.fromJson(Map<String, dynamic> json) =>
      AppCommissionModel(
        id: textOf(json['id']),
        description: textOf(json['descricao'], 'Comissão'),
        value: doubleOf(json['valor']),
        baseValue: doubleOf(json['valorBase']),
        percent: doubleOf(json['percentualAplicado']),
        status: textOf(json['status'], 'pendente'),
        competenceDate: dateOf(json['competenciaData']),
        paidAt: dateOf(json['pagoEm']),
      );
}

class AppReviewModel {
  AppReviewModel(
      {required this.id,
      required this.rating,
      required this.clientName,
      required this.serviceName,
      required this.professionalName,
      this.comment = '',
      this.createdAt});
  final String id;
  final int rating;
  final String clientName;
  final String serviceName;
  final String professionalName;
  final String comment;
  final DateTime? createdAt;

  factory AppReviewModel.fromJson(Map<String, dynamic> json) => AppReviewModel(
        id: textOf(json['id']),
        rating: intOf(json['nota']),
        clientName: textOf(json['cliente_nome'], 'Cliente'),
        serviceName: textOf(json['servico_nome'], 'Serviço'),
        professionalName: textOf(json['profissional_nome'], 'Profissional'),
        comment: textOf(json['comentario']),
        createdAt: dateOf(json['created_at']),
      );
}

class AppNotificationModel {
  AppNotificationModel(
      {required this.id,
      required this.title,
      required this.message,
      required this.read,
      this.createdAt,
      this.url = '',
      this.type = '',
      this.status = ''});
  final String id;
  final String title;
  final String message;
  final bool read;
  final DateTime? createdAt;
  final String url;
  final String type;
  final String status;

  factory AppNotificationModel.fromJson(Map<String, dynamic> json) =>
      AppNotificationModel(
        id: textOf(json['id']),
        title: textOf(json['titulo'] ?? json['title'], 'Notificação'),
        message: textOf(json['mensagem'] ?? json['description']),
        read: boolOf(json['lida'] ?? json['read']),
        createdAt: dateOf(json['created_at'] ?? json['createdAt']),
        url: textOf(json['url'] ?? json['href']),
        type: textOf(json['tipo'] ?? json['type']),
        status: textOf(json['status']),
      );
}

class AppCouponModel {
  AppCouponModel(
      {required this.id,
      required this.code,
      required this.name,
      required this.discountType,
      required this.discountValue,
      required this.active,
      this.description = '',
      this.validFrom,
      this.validUntil,
      this.totalLimit = 0,
      this.clientLimit = 1,
      this.sent = 0,
      this.redeemed = 0,
      this.used = 0,
      this.status = ''});
  final String id;
  final String code;
  final String name;
  final String description;
  final String discountType;
  final double discountValue;
  final DateTime? validFrom;
  final DateTime? validUntil;
  final int totalLimit;
  final int clientLimit;
  final bool active;
  final int sent;
  final int redeemed;
  final int used;
  final String status;

  factory AppCouponModel.fromJson(Map<String, dynamic> json) => AppCouponModel(
        id: textOf(json['id']),
        code: textOf(json['codigo']),
        name: textOf(json['nome'], 'Cupom'),
        description: textOf(json['descricao']),
        discountType: textOf(json['tipo_desconto'], 'percentual'),
        discountValue: doubleOf(json['valor_desconto']),
        validFrom: dateOf(json['valido_de']),
        validUntil: dateOf(json['valido_ate']),
        totalLimit: intOf(json['limite_uso_total']),
        clientLimit: intOf(json['limite_uso_cliente']),
        active: boolOf(json['ativo']),
        sent: intOf(json['enviados']),
        redeemed: intOf(json['resgatados']),
        used: intOf(json['usados']),
        status: textOf(json['status_campanha']),
      );
}

class CouponRecipient {
  CouponRecipient(
      {required this.id,
      required this.name,
      required this.whatsapp,
      required this.token});
  final String id;
  final String name;
  final String whatsapp;
  final String token;

  factory CouponRecipient.fromJson(Map<String, dynamic> json) =>
      CouponRecipient(
        id: textOf(json['id']),
        name: textOf(json['nome'], 'Cliente'),
        whatsapp: textOf(json['whatsapp']),
        token: textOf(json['token']),
      );
}
