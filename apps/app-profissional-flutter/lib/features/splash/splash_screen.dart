import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.onFinished});

  final VoidCallback onFinished;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _logoScale;
  late final Animation<double> _logoOpacity;
  late final Animation<Offset> _titleSlide;
  late final Animation<double> _copyOpacity;
  Timer? _finishTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    );
    _logoScale = Tween<double>(begin: .55, end: 1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0, .46, curve: Curves.easeOutBack),
      ),
    );
    _logoOpacity = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0, .25, curve: Curves.easeOut),
    );
    _titleSlide = Tween<Offset>(
      begin: const Offset(0, .45),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(.30, .72, curve: Curves.easeOutCubic),
      ),
    );
    _copyOpacity = CurvedAnimation(
      parent: _controller,
      curve: const Interval(.34, .82, curve: Curves.easeOut),
    );

    _controller.forward();
    _finishTimer = Timer(const Duration(milliseconds: 2750), widget.onFinished);
  }

  @override
  void dispose() {
    _finishTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -.18),
            radius: 1.05,
            colors: [Color(0xFFFFF3D4), Color(0xFFF8F8F7), Color(0xFFF0F3F4)],
            stops: [0, .40, 1],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Opacity(
                      opacity: _logoOpacity.value,
                      child: Transform.scale(
                        scale: _logoScale.value,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.gold.withValues(alpha: .18),
                                blurRadius: 55,
                                spreadRadius: 15,
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(32),
                            child: Image.asset(
                              'assets/images/brand-logo.png',
                              width: 132,
                              height: 132,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 34),
                    FadeTransition(
                      opacity: _copyOpacity,
                      child: SlideTransition(
                        position: _titleSlide,
                        child: const Column(
                          children: [
                            Text(
                              'SALÃO PREMIUM',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Color(0xFF9E651B),
                                fontSize: 23,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 5.2,
                              ),
                            ),
                            SizedBox(height: 12),
                            SizedBox(
                              width: 150,
                              child:
                                  Divider(color: Color(0xFFD1A348), height: 1),
                            ),
                            SizedBox(height: 12),
                            Text(
                              'APP PROFISSIONAL',
                              style: TextStyle(
                                color: Color(0xFF73767C),
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 3.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
