import { Pressable, StyleSheet, Text, View } from "react-native";
import Trash2 from "lucide-react-native/icons/trash-2";
import { colors, radii } from "@/shared/theme";

type Props = {
  title: string;
  subtitle: string;
  meta: string;
  onPress: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function LibraryRow({
  title,
  subtitle,
  meta,
  onPress,
  actionLabel,
  onAction,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.meta}>{meta}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation?.();
            onAction();
          }}
          style={styles.action}
        >
          <Trash2 color={colors.muted} size={17} strokeWidth={1.8} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 84,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.medium,
  },
  main: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 15, fontWeight: "600" },
  subtitle: { color: colors.muted, fontSize: 13 },
  meta: { color: colors.dim, fontSize: 12 },
  action: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.small,
    backgroundColor: colors.surfaceRaised,
  },
});
