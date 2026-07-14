import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Check from "lucide-react-native/icons/check";
import Search from "lucide-react-native/icons/search";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DEFAULT_CATEGORIES,
  FEED_CATEGORIES,
  normalizeCategories,
  type CategoryOption,
} from "@/lib/categories";
import { colors, radii } from "@/shared/theme";
import {
  categoryGroupLabel,
  categoryLabel,
} from "./categoryLabels";

type Props = {
  visible: boolean;
  selected: string[];
  onSelect: (ids: string[]) => void;
  onClose: () => void;
};

export function CategoryPicker({ visible, selected, onSelect, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(() =>
    normalizeCategories(selected),
  );

  useEffect(() => {
    if (visible) {
      setDraft(normalizeCategories(selected));
      setQuery("");
    }
  }, [visible, selected]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? FEED_CATEGORIES.filter((c) => {
          const label = categoryLabel(c.id).toLowerCase();
          const group = categoryGroupLabel(c.group).toLowerCase();
          return (
            label.includes(q) ||
            c.id.toLowerCase().includes(q) ||
            group.includes(q) ||
            c.label.toLowerCase().includes(q) ||
            c.group.toLowerCase().includes(q)
          );
        })
      : FEED_CATEGORIES;
    return groupBy(filtered);
    // Recompute when language changes so labels refresh
  }, [query, i18n.language]);

  const toggle = (id: string) => {
    setDraft((prev) => {
      if (id === "all") {
        return prev.includes("all") ? [...DEFAULT_CATEGORIES] : ["all"];
      }
      const withoutAll = prev.filter((x) => x !== "all");
      if (withoutAll.includes(id)) {
        const next = withoutAll.filter((x) => x !== id);
        return next.length === 0 ? [...DEFAULT_CATEGORIES] : next;
      }
      return [...withoutAll, id];
    });
  };

  const apply = () => {
    onSelect(normalizeCategories(draft));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("categories.title")}</Text>
          <Pressable onPress={apply} hitSlop={12} style={styles.close}>
            <Text style={styles.closeText}>{t("common.done")}</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>{t("categories.hint")}</Text>

        <View style={styles.searchShell}>
          <Search color={colors.dim} size={18} strokeWidth={1.8} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("categories.search")}
            placeholderTextColor={colors.dim}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            style={styles.search}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {groups.length === 0 ? (
            <Text style={styles.empty}>{t("categories.noMatches")}</Text>
          ) : (
            groups.map(([group, items]) => (
              <View key={group} style={styles.section}>
                <Text style={styles.group}>{categoryGroupLabel(group)}</Text>
                {items.map((item) => {
                  const active = draft.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggle(item.id)}
                      style={[styles.row, active && styles.rowActive]}
                    >
                      <Text
                        style={[styles.label, active && styles.labelActive]}
                        numberOfLines={2}
                      >
                        {categoryLabel(item.id)}
                      </Text>
                      {active ? (
                        <Check color={colors.text} size={18} strokeWidth={2} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function groupBy(items: CategoryOption[]): [string, CategoryOption[]][] {
  const map = new Map<string, CategoryOption[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return [...map.entries()];
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  close: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  closeText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    color: colors.dim,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchShell: {
    marginHorizontal: 16,
    marginBottom: 12,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  search: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  empty: {
    color: colors.dim,
    textAlign: "center",
    marginTop: 32,
  },
  section: {
    gap: 2,
    padding: 4,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.medium,
  },
  group: {
    color: colors.dim,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    marginHorizontal: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: radii.small,
    gap: 10,
  },
  rowActive: {
    backgroundColor: colors.surfacePressed,
  },
  label: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  labelActive: {
    color: colors.text,
  },
});
