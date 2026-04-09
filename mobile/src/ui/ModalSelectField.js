import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

function normalize(value) {
  return String(value ?? '').trim();
}

export default function ModalSelectField({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  compact = false,
  disabled = false,
  searchable = true,
  emptyText = 'No options found.',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((item) => normalize(item?.value) === normalize(value)),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = normalize(query).toLowerCase();
    if (!q) return options;
    return options.filter((item) => normalize(item?.label).toLowerCase().includes(q));
  }, [options, query]);

  const displayText = selected?.label || placeholder;

  return (
    <>
      <View style={compact ? styles.compactWrap : styles.fieldWrap}>
        {!compact && label ? <Text style={styles.label}>{label}</Text> : null}
        <Pressable
          onPress={() => !disabled && setOpen(true)}
          style={[
            compact ? styles.compactButton : styles.fieldButton,
            disabled ? styles.disabled : null,
            selected ? styles.activeBorder : null,
          ]}
        >
          <Text numberOfLines={compact ? 1 : 2} style={[compact ? styles.compactText : styles.fieldText, !selected ? styles.placeholder : null]}>
            {displayText}
          </Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.title}>{label || placeholder}</Text>
              <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            {searchable ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
              />
            ) : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {filtered.map((item) => {
                const isActive = normalize(item?.value) === normalize(value);
                return (
                  <Pressable
                    key={`${item?.value}`}
                    style={[styles.option, isActive ? styles.optionActive : null]}
                    onPress={() => {
                      onChange?.(item?.value);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <Text style={[styles.optionText, isActive ? styles.optionTextActive : null]}>{item?.label}</Text>
                  </Pressable>
                );
              })}
              {!filtered.length ? <Text style={styles.empty}>{emptyText}</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 6 },
  compactWrap: { width: '100%' },
  label: { fontSize: 12, fontWeight: '600', color: '#52525b' },
  fieldButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  compactButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    width: '100%',
  },
  activeBorder: { borderColor: '#0f766e' },
  disabled: { opacity: 0.6 },
  fieldText: { fontSize: 13, color: '#111827' },
  compactText: { fontSize: 12, color: '#111827' },
  placeholder: { color: '#6b7280' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    maxHeight: '82%',
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, paddingRight: 10 },
  closeBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  closeText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  searchInput: {
    margin: 14,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
  },
  list: { marginTop: 12 },
  listContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  option: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#fff' },
  optionActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  optionText: { fontSize: 13, color: '#111827' },
  optionTextActive: { color: '#115e59', fontWeight: '700' },
  empty: { paddingVertical: 18, textAlign: 'center', color: '#6b7280' },
});
