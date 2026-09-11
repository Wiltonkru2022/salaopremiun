import 'package:flutter/material.dart';

String brMoney(num value) {
  final fixed = value.toStringAsFixed(2).split('.');
  final chars = fixed[0].split('').reversed.toList();
  final groups = <String>[];
  for (var i = 0; i < chars.length; i += 3) {
    groups.add(chars.skip(i).take(3).toList().reversed.join());
  }
  return 'R\$ ${groups.reversed.join('.')},${fixed[1]}';
}

String isoDay(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
String brDay(DateTime? date) => date == null
    ? '—'
    : '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';

void showAppError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(error.toString()), behavior: SnackBarBehavior.floating));
}

void showAppSuccess(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));
}
