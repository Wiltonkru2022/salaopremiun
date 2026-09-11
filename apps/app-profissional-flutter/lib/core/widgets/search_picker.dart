import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class SearchPickerOption {
  const SearchPickerOption({
    required this.value,
    required this.label,
    this.description = '',
    this.meta = '',
  });

  final String value;
  final String label;
  final String description;
  final String meta;
}

class SearchPicker extends StatefulWidget {
  const SearchPicker({
    super.key,
    required this.label,
    required this.placeholder,
    required this.options,
    required this.value,
    required this.onChanged,
    this.emptyText = 'Nada encontrado.',
    this.allowClear = true,
    this.hideInputWhenSelected = true,
    this.maxResults = 7,
  });

  final String label;
  final String placeholder;
  final List<SearchPickerOption> options;
  final String value;
  final ValueChanged<String> onChanged;
  final String emptyText;
  final bool allowClear;
  final bool hideInputWhenSelected;
  final int maxResults;

  @override
  State<SearchPicker> createState() => _SearchPickerState();
}

class _SearchPickerState extends State<SearchPicker> {
  final _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selected = widget.options
        .where((option) => option.value == widget.value)
        .firstOrNull;
    final query = _query.text.trim().toLowerCase();
    final results = query.isEmpty
        ? <SearchPickerOption>[]
        : widget.options
            .where((option) =>
                '${option.label} ${option.description} ${option.meta}'
                    .toLowerCase()
                    .contains(query))
            .take(widget.maxResults)
            .toList();
    final showInput = selected == null || !widget.hideInputWhenSelected;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          widget.label.toUpperCase(),
          style: const TextStyle(
            color: AppColors.muted,
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.4,
          ),
        ),
        const SizedBox(height: 8),
        if (selected != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.goldSoft,
              borderRadius: BorderRadius.circular(17),
              border: Border.all(color: const Color(0xFFFDE68A)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0D92400E),
                  blurRadius: 10,
                  offset: Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        selected.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      if (selected.description.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          selected.description,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (widget.allowClear)
                  IconButton.filledTonal(
                    onPressed: () {
                      widget.onChanged('');
                      _query.clear();
                      setState(() {});
                    },
                    icon: const Icon(Icons.close_rounded, size: 18),
                  ),
              ],
            ),
          ),
          if (showInput) const SizedBox(height: 8),
        ],
        if (showInput) ...[
          TextField(
            controller: _query,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: widget.placeholder,
              prefixIcon: const Icon(Icons.search_rounded),
            ),
            onChanged: (_) => setState(() {}),
          ),
          if (query.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              constraints: const BoxConstraints(maxHeight: 235),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(17),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x17111827),
                    blurRadius: 24,
                    offset: Offset(0, 12),
                  ),
                ],
              ),
              child: results.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        widget.emptyText,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      padding: EdgeInsets.zero,
                      itemCount: results.length,
                      separatorBuilder: (_, __) =>
                          const Divider(height: 1, color: Color(0xFFF4F4F5)),
                      itemBuilder: (context, index) {
                        final option = results[index];
                        return ListTile(
                          dense: true,
                          title: Text(
                            option.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                          subtitle: option.description.isEmpty
                              ? null
                              : Text(
                                  option.description,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                          trailing: option.meta.isEmpty
                              ? null
                              : Text(
                                  option.meta,
                                  style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                          onTap: () {
                            widget.onChanged(option.value);
                            _query.clear();
                            setState(() {});
                          },
                        );
                      },
                    ),
            ),
          ],
        ],
      ],
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
