import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.compact = false, this.size = 44});

  final bool compact;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(size * .28),
          child: Image.asset(
            'assets/images/brand-logo.png',
            width: size,
            height: size,
            fit: BoxFit.cover,
          ),
        ),
        if (!compact) ...[
          const SizedBox(width: 12),
          const Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'SALÃO PREMIUM',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.goldDark,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2.0,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Profissional',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.ink,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
