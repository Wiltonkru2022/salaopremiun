import 'dart:io';

import 'package:permission_handler/permission_handler.dart';

abstract final class AppPermissions {
  static bool _requested = false;

  static Future<void> requestStartupPermissions() async {
    if (_requested || !Platform.isAndroid) return;
    _requested = true;

    await Permission.notification.request();
  }
}
