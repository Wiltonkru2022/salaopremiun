import 'package:flutter/material.dart';
import 'app_colors.dart';

abstract final class AppTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.gold,
        brightness: Brightness.light,
        surface: AppColors.surface,
      ),
      scaffoldBackgroundColor: AppColors.background,
    );

    return base.copyWith(
      splashFactory: InkSparkle.splashFactory,
      dividerColor: AppColors.border,
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.ink,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(50),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.ink,
          minimumSize: const Size.fromHeight(48),
          side: const BorderSide(color: AppColors.border),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.zinc700,
          textStyle: const TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      textTheme: base.textTheme
          .apply(
            bodyColor: AppColors.ink,
            displayColor: AppColors.ink,
          )
          .copyWith(
            headlineLarge: const TextStyle(
              fontSize: 31,
              height: 1.02,
              fontWeight: FontWeight.w900,
              letterSpacing: -1.6,
              color: AppColors.ink,
            ),
            headlineMedium: const TextStyle(
              fontSize: 26,
              height: 1.05,
              fontWeight: FontWeight.w900,
              letterSpacing: -1.2,
              color: AppColors.ink,
            ),
            titleLarge: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
              color: AppColors.ink,
            ),
            bodyLarge: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
            bodyMedium: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.muted,
            ),
            labelLarge: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: AppColors.ink,
            ),
          ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.ink, width: 1.5),
        ),
      ),
    );
  }
}
